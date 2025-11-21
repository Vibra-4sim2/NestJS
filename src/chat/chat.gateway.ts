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
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { SendMessageWsDto, JoinRoomDto, TypingDto } from './dto/message.dto';
import { JwtService } from '@nestjs/jwt';

/**
 * ChatGateway
 * WebSocket gateway for real-time chat functionality
 * Handles room management, message broadcasting, and typing indicators
 */
@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: '*', // Configure this based on your frontend URL in production
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Initialize gateway
   */
  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  /**
   * Handle new client connection
   * Authenticate user via JWT token in handshake
   */
  async handleConnection(client: Socket) {
    try {
      // Extract token from auth header or query
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

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

      // Store user info in socket data
      client.data.userId = payload.sub || payload.userId || payload.id;
      client.data.email = payload.email;

      this.logger.log(`Client connected: ${client.id} (User: ${client.data.userId})`);
      client.emit('connected', { message: 'Connected to chat server', userId: client.data.userId });
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
   * Join a chat room for a specific sortie
   * Client sends: { sortieId: string }
   */
  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { sortieId } = payload;

      // Verify user is a member of this chat
      const isMember = await this.chatService.isUserMember(sortieId, userId);
      if (!isMember) {
        this.logger.warn(`User ${userId} attempted to join room for sortie ${sortieId} but is not a member`);
        client.emit('error', { message: 'You are not a member of this chat' });
        return;
      }

      // Create room name based on sortie ID
      const roomName = `sortie_${sortieId}`;

      // Join the socket to the room
      await client.join(roomName);
      this.logger.log(`User ${userId} joined room ${roomName}`);

      // Get recent messages for this chat
      const recentMessages = await this.messageService.getRecentMessages(sortieId, userId, 50);

      // Emit success with recent messages
      client.emit('joinedRoom', {
        sortieId,
        room: roomName,
        messages: recentMessages,
        message: 'Successfully joined chat room',
      });

      // Notify other users in the room
      client.to(roomName).emit('userJoinedRoom', {
        userId,
        sortieId,
      });
    } catch (error) {
      this.logger.error(`Error joining room: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to join room' });
    }
  }

  /**
   * Leave a chat room
   * Client sends: { sortieId: string }
   */
  @SubscribeMessage('leaveRoom')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomDto,
  ) {
    try {
      const userId = client.data.userId;
      const { sortieId } = payload;
      const roomName = `sortie_${sortieId}`;

      await client.leave(roomName);
      this.logger.log(`User ${userId} left room ${roomName}`);

      client.emit('leftRoom', { sortieId, room: roomName });

      // Notify other users
      client.to(roomName).emit('userLeftRoom', {
        userId,
        sortieId,
      });
    } catch (error) {
      this.logger.error(`Error leaving room: ${error.message}`);
      client.emit('error', { message: 'Failed to leave room' });
    }
  }

  /**
   * Send a message to a chat room
   * Client sends: SendMessageWsDto
   */
  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendMessageWsDto,
  ) {
    try {
      const userId = client.data.userId;
      if (!userId) {
        throw new UnauthorizedException('User not authenticated');
      }

      const { sortieId, ...messageData } = payload;

      // Send message via service (handles validation and persistence)
      const message = await this.messageService.sendMessage(sortieId, userId, messageData);

      const roomName = `sortie_${sortieId}`;

      // Broadcast message to all users in the room (including sender)
      this.server.to(roomName).emit('receiveMessage', {
        message,
        sortieId,
      });

      this.logger.log(`Message sent to room ${roomName} by user ${userId}`);

      // Acknowledge to sender
      client.emit('messageSent', {
        messageId: message._id,
        success: true,
      });
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      client.emit('error', { message: error.message || 'Failed to send message' });
    }
  }

  /**
   * Typing indicator
   * Client sends: { sortieId: string, isTyping: boolean }
   */
  @SubscribeMessage('typing')
  async handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sortieId: string; isTyping: boolean },
  ) {
    try {
      const userId = client.data.userId;
      const { sortieId, isTyping } = payload;
      const roomName = `sortie_${sortieId}`;

      // Broadcast typing status to others in the room (not sender)
      client.to(roomName).emit('userTyping', {
        userId,
        sortieId,
        isTyping,
      });
    } catch (error) {
      this.logger.error(`Error handling typing indicator: ${error.message}`);
    }
  }

  /**
   * Mark message as read
   * Client sends: { messageId: string }
   */
  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { messageId: string; sortieId: string },
  ) {
    try {
      const userId = client.data.userId;
      const { messageId, sortieId } = payload;

      await this.messageService.markAsRead(messageId, userId);

      const roomName = `sortie_${sortieId}`;

      // Notify others that message was read
      client.to(roomName).emit('messageRead', {
        messageId,
        userId,
        sortieId,
      });
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
    }
  }

  /**
   * Get online users in a room (optional feature)
   * Client sends: { sortieId: string }
   */
  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { sortieId: string },
  ) {
    try {
      const { sortieId } = payload;
      const roomName = `sortie_${sortieId}`;

      // Get all sockets in the room
      const sockets = await this.server.in(roomName).fetchSockets();
      const onlineUserIds = sockets.map((socket) => socket.data.userId).filter(Boolean);

      // Remove duplicates (same user might have multiple connections)
      const uniqueOnlineUserIds = [...new Set(onlineUserIds)];

      client.emit('onlineUsers', {
        sortieId,
        userIds: uniqueOnlineUserIds,
        count: uniqueOnlineUserIds.length,
      });
    } catch (error) {
      this.logger.error(`Error getting online users: ${error.message}`);
    }
  }

  /**
   * Verify JWT token
   * @param token - JWT token to verify
   * @returns Decoded token payload or null
   */
  private async verifyToken(token: string): Promise<any> {
    try {
      // Use the same secret as your auth module
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.JWT_SECRET || 'your-secret-key',
      });
      return payload;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Broadcast a system notification to a room
   * Can be called from services (e.g., when new participant joins)
   * @param sortieId - The sortie ID
   * @param message - The notification message
   */
  broadcastNotification(sortieId: string, message: string, data?: any) {
    const roomName = `sortie_${sortieId}`;
    this.server.to(roomName).emit('notification', {
      sortieId,
      message,
      data,
      timestamp: new Date(),
    });
    this.logger.log(`Notification sent to room ${roomName}: ${message}`);
  }
}
