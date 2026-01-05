import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConversationService } from './conversation.service';
import {
  InitiateConversationDto,
  SendDirectMessageDto,
  MarkAsReadDto,
  TypingIndicatorDto,
  GetMessagesDto,
  DeleteConversationDto,
} from './dto/conversation.dto';

/**
 * ConversationGateway
 * WebSocket gateway for real-time private messaging
 * Namespace: /conversations
 * Completely separate from group chat (/chat namespace)
 */
@WebSocketGateway({
  namespace: '/conversations',
  cors: {
    origin: '*', // Configure based on your mobile app in production
    credentials: true,
  },
})
export class ConversationGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ConversationGateway.name);

  constructor(
    private readonly conversationService: ConversationService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Initialize gateway
   */
  afterInit(server: Server) {
    this.logger.log('Conversations WebSocket Gateway initialized');
  }

  /**
   * Handle new client connection
   * Authenticate user via JWT token
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from auth header or handshake
      const token =
        client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);
      if (!payload) {
        this.logger.warn(`Client ${client.id} authentication failed`);
        client.emit('error', { message: 'Invalid token' });
        client.disconnect();
        return;
      }

      const newUserId = payload.sub || payload.userId || payload.id;

      // ✅ PREVENT SOCKET REUSE ACROSS DIFFERENT USERS
      if (client.data.userId && client.data.userId !== newUserId) {
        this.logger.warn(
          `🔄 Socket ${client.id} user changed: ${client.data.userId} -> ${newUserId}. Forcing disconnect.`,
        );
        client.emit('error', { message: 'Session changed. Please reconnect.' });
        client.disconnect();
        return;
      }

      // Store user info in socket data
      client.data.userId = newUserId;
      client.data.email = payload.email;

      this.logger.log(`Client connected: ${client.id} (User: ${client.data.userId})`);

      // Emit connection success
      client.emit('connected', {
        message: 'Connected to conversations server',
        userId: client.data.userId,
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  /**
   * Handle client disconnect
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id} (User: ${client.data.userId})`);
  }

  /**
   * Get all conversations for the authenticated user
   * Client sends: {}
   * Returns: { conversations: [...] }
   */
  @SubscribeMessage('getMyConversations')
  async handleGetMyConversations(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const conversations = await this.conversationService.getUserConversations(userId);

      // Format conversations with other user info and unread count
      const formattedConversations = conversations.map((conv: any) => {
        // Get the other user (not the current user)
        const otherUser = conv.participants.find(
          (p: any) => p._id.toString() !== userId.toString(),
        );

        return {
          _id: conv._id,
          conversationId: conv._id,
          otherUser: {
            _id: otherUser?._id,
            name: otherUser?.name,
            email: otherUser?.email,
            avatar: otherUser?.avatar,
          },
          lastMessage: conv.lastMessage,
          unreadCount: conv.unreadCount?.get(userId.toString()) || 0,
          isMuted: conv.mutedBy?.get(userId.toString()) || false,
          updatedAt: conv.updatedAt,
          createdAt: conv.createdAt,
        };
      });

      client.emit('conversationsList', { conversations: formattedConversations });

      this.logger.log(`Sent ${formattedConversations.length} conversations to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error getting conversations: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to get conversations' });
    }
  }

  /**
   * Initiate or get existing conversation with another user
   * Client sends: { recipientId: string }
   * Returns: { conversation, messages: [...] }
   */
  @SubscribeMessage('initiateConversation')
  async handleInitiateConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: InitiateConversationDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { recipientId } = payload;

      // Validate recipientId is provided
      if (!recipientId || recipientId.trim() === '') {
        this.logger.error('🔴 recipientId is missing or empty from payload');
        client.emit('error', { 
          message: 'Recipient ID is required',
          code: 'INVALID_RECIPIENT'
        });
        return;
      }

      // Validate recipientId is not the same as userId
      if (userId === recipientId || userId.toString() === recipientId.toString()) {
        this.logger.error(`🔴 Attempt to create conversation with self: userId=${userId}, recipientId=${recipientId}`);
        client.emit('error', { 
          message: 'Cannot create conversation with yourself',
          code: 'SELF_CONVERSATION'
        });
        return;
      }

      this.logger.log(`Initiating conversation: ${userId} -> ${recipientId}`);

      // Get or create conversation
      const conversation = await this.conversationService.findOrCreateConversation(
        userId,
        recipientId,
      );

      // Join the conversation room
      const roomName = `conv_${conversation._id}`;
      await client.join(roomName);

      // Get recent messages
      const messages = await this.conversationService.getMessages(String(conversation._id), userId, 50);

      // Get the other user info
      const otherUser = (conversation.participants as any[]).find(
        (p: any) => p._id.toString() !== userId.toString(),
      );

      client.emit('conversationReady', {
        conversation: {
          _id: conversation._id,
          conversationId: conversation._id,
          otherUser: {
            _id: otherUser?._id,
            name: otherUser?.name,
            email: otherUser?.email,
            avatar: otherUser?.avatar,
          },
          unreadCount: conversation.unreadCount?.get(userId.toString()) || 0,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        messages,
        room: roomName,
      });

      this.logger.log(`User ${userId} initiated conversation with ${recipientId}, room: ${roomName}`);
    } catch (error) {
      this.logger.error(`Error initiating conversation: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to initiate conversation' });
    }
  }

  /**
   * Join a conversation room (for receiving real-time updates)
   * Client sends: { conversationId: string }
   */
  @SubscribeMessage('joinConversation')
  async handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId } = payload;

      // Verify user is participant
      const isParticipant = await this.conversationService.isUserParticipant(conversationId, userId);
      if (!isParticipant) {
        client.emit('error', { message: 'You are not a participant in this conversation' });
        return;
      }

      // Join room
      const roomName = `conv_${conversationId}`;
      await client.join(roomName);

      // Get messages
      const messages = await this.conversationService.getMessages(conversationId, userId, 50);

      client.emit('joinedConversation', {
        conversationId,
        room: roomName,
        messages,
      });

      // Notify other user
      client.to(roomName).emit('userJoinedConversation', {
        userId,
        conversationId,
      });

      this.logger.log(`User ${userId} joined conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Error joining conversation: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to join conversation' });
    }
  }

  /**
   * Leave a conversation room
   * Client sends: { conversationId: string }
   */
  @SubscribeMessage('leaveConversation')
  async handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { conversationId } = payload;
      const roomName = `conv_${conversationId}`;

      await client.leave(roomName);

      client.emit('leftConversation', { conversationId, room: roomName });

      // Notify other user
      client.to(roomName).emit('userLeftConversation', {
        userId,
        conversationId,
      });

      this.logger.log(`User ${userId} left conversation ${conversationId}`);
    } catch (error) {
      this.logger.error(`Error leaving conversation: ${error.message}`);
    }
  }

  /**
   * Send a direct message
   * Client sends: SendDirectMessageDto
   * Broadcasts to both users in conversation
   */
  @SubscribeMessage('sendDirectMessage')
  async handleSendDirectMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendDirectMessageDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId, ...messageData } = payload;

      // Send message via service
      const message = await this.conversationService.sendDirectMessage(
        conversationId,
        userId,
        { ...messageData, conversationId } as SendDirectMessageDto,
      );

      const roomName = `conv_${conversationId}`;

      // Broadcast to all users in conversation (including sender for confirmation)
      this.server.to(roomName).emit('receiveDirectMessage', {
        message,
        conversationId,
      });

      this.logger.log(`Message sent in conversation ${conversationId} by user ${userId}`);

      // Acknowledge to sender
      client.emit('directMessageSent', {
        messageId: message._id,
        tempId: payload.tempId,
        success: true,
      });
    } catch (error) {
      this.logger.error(`Error sending direct message: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to send message' });
    }
  }

  /**
   * Mark conversation as read
   * Client sends: { conversationId: string }
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(@ConnectedSocket() client: Socket, @MessageBody() payload: MarkAsReadDto) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId } = payload;

      await this.conversationService.markConversationAsRead(conversationId, userId);

      const roomName = `conv_${conversationId}`;

      // Notify sender that their messages were read
      client.to(roomName).emit('messagesRead', {
        conversationId,
        readBy: userId,
        readAt: new Date(),
      });

      client.emit('markedAsRead', { conversationId, success: true });

      this.logger.log(`Conversation ${conversationId} marked as read by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error marking as read: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to mark as read' });
    }
  }

  /**
   * Typing indicator
   * Client sends: { conversationId: string, isTyping: boolean }
   */
  @SubscribeMessage('typing')
  async handleTyping(@ConnectedSocket() client: Socket, @MessageBody() payload: TypingIndicatorDto) {
    try {
      const userId = client.data.userId;
      const { conversationId, isTyping } = payload;
      const roomName = `conv_${conversationId}`;

      // Broadcast to other user only (not sender)
      client.to(roomName).emit('userTyping', {
        conversationId,
        userId,
        isTyping,
      });
    } catch (error) {
      this.logger.error(`Error handling typing indicator: ${error.message}`);
    }
  }

  /**
   * Get messages with pagination
   * Client sends: { conversationId: string, limit?: number, before?: string }
   */
  @SubscribeMessage('getMessages')
  async handleGetMessages(@ConnectedSocket() client: Socket, @MessageBody() payload: GetMessagesDto) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId, limit, before } = payload;

      const messages = await this.conversationService.getMessages(
        conversationId,
        userId,
        limit || 50,
        before,
      );

      client.emit('messagesList', {
        conversationId,
        messages,
        hasMore: messages.length === (limit || 50),
      });

      this.logger.log(`Sent ${messages.length} messages to user ${userId}`);
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to get messages' });
    }
  }

  /**
   * Delete/archive conversation for user
   * Client sends: { conversationId: string }
   */
  @SubscribeMessage('deleteConversation')
  async handleDeleteConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DeleteConversationDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId } = payload;

      await this.conversationService.deleteConversationForUser(conversationId, userId);

      client.emit('conversationDeleted', { conversationId, success: true });

      this.logger.log(`Conversation ${conversationId} deleted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting conversation: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to delete conversation' });
    }
  }

  /**
   * Mute/unmute conversation
   * Client sends: { conversationId: string, muted: boolean }
   */
  @SubscribeMessage('muteConversation')
  async handleMuteConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string; muted: boolean },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId, muted } = payload;

      await this.conversationService.muteConversation(conversationId, userId, muted);

      client.emit('conversationMuted', { conversationId, muted, success: true });

      this.logger.log(`Conversation ${conversationId} ${muted ? 'muted' : 'unmuted'} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error muting conversation: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to mute conversation' });
    }
  }

  /**
   * Get unread count for a conversation
   * Client sends: { conversationId: string }
   */
  @SubscribeMessage('getUnreadCount')
  async handleGetUnreadCount(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { conversationId: string },
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { conversationId } = payload;

      const count = await this.conversationService.getUnreadCount(conversationId, userId);

      client.emit('unreadCount', { conversationId, count });
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to get unread count' });
    }
  }

  /**
   * Verify JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload or null
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }
}
