import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { PollService } from './poll.service';
import { CreatePollDto } from './dto/create-poll.dto';
import { VoteDto } from './dto/vote.dto';
import { ChatService } from '../chat/chat.service';
import { Types } from 'mongoose';

/**
 * PollGateway
 * WebSocket gateway for real-time poll updates
 * Broadcasts poll events to chat room members
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*', // Configure for production
    credentials: true,
  },
})
export class PollGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PollGateway.name);

  constructor(
    private readonly pollService: PollService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Create a poll and broadcast to room
   * Client sends: { sortieId: string, poll: CreatePollDto }
   */
  @SubscribeMessage('poll.create')
  async handleCreatePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sortieId: string; poll: CreatePollDto },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { sortieId, poll: createPollDto } = payload;

      // Create poll via service using sortieId
      const poll = await this.pollService.createPollForSortie(sortieId, userId, createPollDto);

      this.logger.log(`Poll created via WebSocket: ${poll._id} by user ${userId} for sortie ${sortieId}`);

      // Create a chat message for the poll
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);
      const chatIdObjectId = new Types.ObjectId(poll.chatId);
      const pollIdObjectId = new Types.ObjectId(poll._id);

      const pollMessage = await this.chatService.createPollMessage(
        chatIdObjectId,
        sortieObjectId,
        userObjectId,
        pollIdObjectId,
      );

      // Format the message for iOS client
      // Ensure poll object matches PollResponseDto structure exactly
      const formattedMessage = {
        _id: String(pollMessage._id),
        sortieId: sortieId,
        chatId: poll.chatId,
        type: 'poll',
        poll: {
          _id: poll._id,
          chatId: poll.chatId,
          creatorId: poll.creatorId,
          question: poll.question,
          options: poll.options.map(opt => ({
            optionId: opt.optionId,
            text: opt.text,
            votes: opt.votes,
          })),
          allowMultiple: poll.allowMultiple,
          closesAt: poll.closesAt,
          closed: poll.closed,
          userVotedOptionIds: poll.userVotedOptionIds,
          totalVotes: poll.totalVotes,
          createdAt: poll.createdAt,
          updatedAt: poll.updatedAt,
        },
        senderId: String(pollMessage.senderId._id),
        sender: {
          _id: String(pollMessage.senderId._id),
          firstName: pollMessage.senderId.firstName,
          lastName: pollMessage.senderId.lastName,
          email: pollMessage.senderId.email,
          avatar: pollMessage.senderId.avatar,
        },
        createdAt: pollMessage.createdAt,
        updatedAt: pollMessage.updatedAt,
      };

      // Broadcast to all members in the sortie room via receiveMessage
      const roomName = `sortie_${sortieId}`;
      this.server.to(roomName).emit('receiveMessage', {
        message: formattedMessage,
        sortieId,
      });

      this.logger.log(`Poll message broadcast to room ${roomName}`);

      // Send confirmation to creator
      client.emit('poll.createSuccess', {
        poll,
        message: 'Poll created successfully',
      });

      return poll;
    } catch (error) {
      this.logger.error(`Error creating poll via WebSocket: ${error.message}`);
      client.emit('poll.error', {
        action: 'create',
        message: error.message || 'Failed to create poll',
      });
    }
  }

  /**
   * Vote on a poll and broadcast update
   * Client sends: { pollId: string, vote: VoteDto }
   */
  @SubscribeMessage('poll.vote')
  async handleVote(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pollId: string; vote: VoteDto },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { pollId, vote: voteDto } = payload;

      // Submit vote via service
      const poll = await this.pollService.vote(pollId, userId, voteDto);

      this.logger.log(`Vote submitted via WebSocket: poll ${pollId} by user ${userId}`);

      // Get sortieId from the poll's chatId to broadcast to correct room
      const sortieId = await this.pollService.getSortieIdFromChatId(poll.chatId as any);
      const roomName = `sortie_${sortieId}`;
      
      this.server.to(roomName).emit('poll.voted', {
        poll,
        userId,
        optionIds: voteDto.optionIds,
        message: 'Poll updated with new vote',
      });

      // Send confirmation to voter
      client.emit('poll.voteSuccess', {
        poll,
        message: 'Vote recorded successfully',
      });

      return poll;
    } catch (error) {
      this.logger.error(`Error voting on poll via WebSocket: ${error.message}`);
      client.emit('poll.error', {
        action: 'vote',
        message: error.message || 'Failed to record vote',
      });
    }
  }

  /**
   * Close a poll and broadcast
   * Client sends: { pollId: string }
   */
  @SubscribeMessage('poll.close')
  async handleClosePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { pollId: string },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { pollId } = payload;

      // Close poll via service
      const poll = await this.pollService.closePoll(pollId, userId);

      this.logger.log(`Poll closed via WebSocket: ${pollId} by user ${userId}`);

      // Get sortieId from the poll's chatId to broadcast to correct room
      const sortieId = await this.pollService.getSortieIdFromChatId(poll.chatId as any);
      const roomName = `sortie_${sortieId}`;
      
      this.server.to(roomName).emit('poll.closed', {
        poll,
        message: 'Poll has been closed',
      });

      // Send confirmation to closer
      client.emit('poll.closeSuccess', {
        poll,
        message: 'Poll closed successfully',
      });

      return poll;
    } catch (error) {
      this.logger.error(`Error closing poll via WebSocket: ${error.message}`);
      client.emit('poll.error', {
        action: 'close',
        message: error.message || 'Failed to close poll',
      });
    }
  }

  /**
   * Helper method to broadcast poll events from REST controller
   * Can be called from PollService after REST operations
   */
  async broadcastPollCreated(sortieId: string, poll: any) {
    const roomName = `sortie_${sortieId}`;
    this.server.to(roomName).emit('poll.created', {
      poll,
      message: 'New poll created',
    });
  }

  async broadcastPollVoted(sortieId: string, poll: any, userId: string, optionIds: string[]) {
    const roomName = `sortie_${sortieId}`;
    this.server.to(roomName).emit('poll.voted', {
      poll,
      userId,
      optionIds,
      message: 'Poll updated with new vote',
    });
  }

  async broadcastPollClosed(sortieId: string, poll: any) {
    const roomName = `sortie_${sortieId}`;
    this.server.to(roomName).emit('poll.closed', {
      poll,
      message: 'Poll has been closed',
    });
  }
}
