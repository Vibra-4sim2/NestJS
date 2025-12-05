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

  constructor(private readonly pollService: PollService) {}

  /**
   * Create a poll and broadcast to room
   * Client sends: { chatId: string, poll: CreatePollDto }
   */
  @SubscribeMessage('poll.create')
  async handleCreatePoll(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { chatId: string; poll: CreatePollDto },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { chatId, poll: createPollDto } = payload;

      // Create poll via service
      const poll = await this.pollService.createPoll(chatId, userId, createPollDto);

      this.logger.log(`Poll created via WebSocket: ${poll._id} by user ${userId}`);

      // Broadcast to all members in the chat room
      // Assuming chat rooms use format: chat_<chatId> or sortie_<sortieId>
      // You may need to adjust based on your ChatGateway room naming
      const roomName = `chat_${chatId}`;
      
      this.server.to(roomName).emit('poll.created', {
        poll,
        message: 'New poll created',
      });

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

      // Broadcast updated poll to all members in the chat room
      const roomName = `chat_${poll.chatId}`;
      
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

      // Broadcast to all members in the chat room
      const roomName = `chat_${poll.chatId}`;
      
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
  broadcastPollCreated(chatId: string, poll: any) {
    const roomName = `chat_${chatId}`;
    this.server.to(roomName).emit('poll.created', {
      poll,
      message: 'New poll created',
    });
  }

  broadcastPollVoted(chatId: string, poll: any, userId: string, optionIds: string[]) {
    const roomName = `chat_${chatId}`;
    this.server.to(roomName).emit('poll.voted', {
      poll,
      userId,
      optionIds,
      message: 'Poll updated with new vote',
    });
  }

  broadcastPollClosed(chatId: string, poll: any) {
    const roomName = `chat_${chatId}`;
    this.server.to(roomName).emit('poll.closed', {
      poll,
      message: 'Poll has been closed',
    });
  }
}
