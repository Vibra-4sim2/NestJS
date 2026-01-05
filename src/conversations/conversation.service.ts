import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Conversation, ConversationDocument } from './entities/conversation.schema';
import {
  DirectMessage,
  DirectMessageDocument,
  DirectMessageType,
  MessageStatus,
} from './entities/direct-message.schema';
import { SendDirectMessageDto } from './dto/conversation.dto';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * ConversationService
 * Handles all private messaging operations between users
 * Separate from group chat (sortie-based) system
 */
@Injectable()
export class ConversationService {
  private readonly logger = new Logger(ConversationService.name);

  constructor(
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
    @InjectModel(DirectMessage.name) private directMessageModel: Model<DirectMessageDocument>,
    @InjectModel('User') private userModel: Model<any>,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Find or create a conversation between two users
   * Ensures only one conversation exists between any two users
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns The conversation document with populated participants
   */
  async findOrCreateConversation(
    userId1: string | Types.ObjectId,
    userId2: string | Types.ObjectId,
  ): Promise<ConversationDocument> {
    try {
      const user1Id = new Types.ObjectId(userId1);
      const user2Id = new Types.ObjectId(userId2);

      // Prevent user from creating conversation with themselves
      if (user1Id.equals(user2Id)) {
        this.logger.error(`Attempt to create self-conversation with user: ${user1Id.toString()}`);
        throw new BadRequestException('Cannot create conversation with yourself');
      }

      // Sort participants to ensure consistent query regardless of order
      const participantIds = [user1Id, user2Id].sort((a, b) => 
        a.toString().localeCompare(b.toString())
      );

      this.logger.log(
        `Finding/creating conversation between: ${participantIds[0].toString()} <-> ${participantIds[1].toString()}`,
      );

      // Try to find existing conversation
      let conversation = await this.conversationModel
        .findOne({
          participants: { $all: participantIds, $size: 2 },
        })
        .populate('participants', 'name email avatar')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .exec();

      // If conversation doesn't exist, create it
      // If conversation doesn't exist, create it
      if (!conversation) {
        this.logger.log(`Creating new conversation between users`);

        conversation = new this.conversationModel({
          participants: participantIds,
          unreadCount: {
            [user1Id.toString()]: 0,
            [user2Id.toString()]: 0,
          },
        });

        await conversation.save();
        await conversation.populate('participants', 'name email avatar');

        this.logger.log(`✅ Conversation created: ${conversation._id}`);
      } else {
        this.logger.log(`✅ Found existing conversation: ${conversation._id}`);
      }

      return conversation;
    } catch (error) {
      // Handle duplicate key error gracefully
      if (error.code === 11000) {
        this.logger.warn(`Duplicate conversation detected, attempting to find existing one`);
        
        const user1Id = new Types.ObjectId(userId1);
        const user2Id = new Types.ObjectId(userId2);
        const participantIds = [user1Id, user2Id].sort((a, b) => 
          a.toString().localeCompare(b.toString())
        );
        
        // Try to find the existing conversation
        const existingConversation = await this.conversationModel
          .findOne({
            participants: { $all: participantIds, $size: 2 },
          })
          .populate('participants', 'name email avatar')
          .populate({
            path: 'lastMessage',
            populate: {
              path: 'senderId',
              select: 'name avatar',
            },
          })
          .exec();
          
        if (existingConversation) {
          this.logger.log(`✅ Found existing conversation after duplicate error: ${existingConversation._id}`);
          return existingConversation;
        }
      }
      
      this.logger.error(`❌ Error finding/creating conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all conversations for a user
   * @param userId - User ID
   * @returns Array of conversations with participant info and last message
   */
  async getUserConversations(userId: string | Types.ObjectId): Promise<ConversationDocument[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const conversations = await this.conversationModel
        .find({
          participants: userObjectId,
          [`deletedBy.${userObjectId.toString()}`]: { $ne: true },
        })
        .populate('participants', 'name email avatar')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .sort({ updatedAt: -1 })
        .exec();

      this.logger.log(`Retrieved ${conversations.length} conversations for user ${userId}`);
      return conversations;
    } catch (error) {
      this.logger.error(`Error getting user conversations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get a conversation by ID
   * @param conversationId - Conversation ID
   * @param userId - User ID requesting (for authorization)
   * @returns The conversation document
   */
  async getConversationById(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<ConversationDocument> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      const conversation = await this.conversationModel
        .findById(conversationObjectId)
        .populate('participants', 'name email avatar')
        .populate({
          path: 'lastMessage',
          populate: {
            path: 'senderId',
            select: 'name avatar',
          },
        })
        .exec();

      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      // Verify user is a participant
      const isParticipant = conversation.participants.some((participant: any) =>
        participant._id.equals(userObjectId),
      );

      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }

      return conversation;
    } catch (error) {
      this.logger.error(`Error getting conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send a direct message in a conversation
   * @param conversationId - Conversation ID
   * @param senderId - Sender user ID
   * @param dto - Message data
   * @returns The created message document
   */
  async sendDirectMessage(
    conversationId: string | Types.ObjectId,
    senderId: string | Types.ObjectId,
    dto: SendDirectMessageDto,
  ): Promise<DirectMessageDocument> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const senderObjectId = new Types.ObjectId(senderId);

      // Get conversation and verify sender is participant
      const conversation = await this.conversationModel.findById(conversationObjectId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const isParticipant = conversation.participants.some((p) => p.equals(senderObjectId));
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }

      // Get recipient (the other participant)
      const recipientId = conversation.participants.find((p) => !p.equals(senderObjectId));
      if (!recipientId) {
        throw new BadRequestException('Invalid conversation structure');
      }

      // Validate message content
      this.validateMessageContent(dto);

      // Create the message
      const message = new this.directMessageModel({
        conversationId: conversationObjectId,
        senderId: senderObjectId,
        recipientId: recipientId,
        type: dto.type,
        content: dto.content,
        mediaUrl: dto.mediaUrl,
        thumbnailUrl: dto.thumbnailUrl,
        mediaDuration: dto.mediaDuration,
        fileSize: dto.fileSize,
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        location: dto.location,
        replyTo: dto.replyTo ? new Types.ObjectId(dto.replyTo) : undefined,
        tempId: dto.tempId,
        isRead: false,
        status: MessageStatus.SENT,
      });

      const savedMessage = await message.save();

      // Populate sender information
      await savedMessage.populate('senderId', 'name email avatar');
      if (savedMessage.replyTo) {
        await savedMessage.populate('replyTo');
      }

      // Update conversation's last message and increment unread count for recipient
      conversation.lastMessage = savedMessage._id as Types.ObjectId;
      const currentUnreadCount = conversation.unreadCount.get(recipientId.toString()) || 0;
      conversation.unreadCount.set(recipientId.toString(), currentUnreadCount + 1);
      await conversation.save();

      this.logger.log(`Message sent in conversation ${conversationId} by user ${senderId}`);

      // Send push notification to recipient
      try {
        const sender = await this.userModel.findById(senderObjectId);
        const senderName = sender?.name || 'Someone';

        let notificationBody = '';
        switch (dto.type) {
          case DirectMessageType.TEXT:
            notificationBody = dto.content || 'New message';
            break;
          case DirectMessageType.IMAGE:
            notificationBody = '📷 Photo';
            break;
          case DirectMessageType.VIDEO:
            notificationBody = '🎥 Video';
            break;
          case DirectMessageType.AUDIO:
            notificationBody = '🎵 Audio';
            break;
          case DirectMessageType.FILE:
            notificationBody = `📎 ${dto.fileName || 'File'}`;
            break;
          case DirectMessageType.LOCATION:
            notificationBody = '📍 Location';
            break;
          default:
            notificationBody = 'New message';
        }

        await this.notificationsService.notifyUsers([recipientId.toString()], {
          title: senderName,
          body: notificationBody,
          data: {
            type: 'private_message',
            conversationId: String(conversationId),
            messageId: String(savedMessage._id),
            senderId: String(senderId),
            senderName,
          },
        });

        this.logger.log(`Push notification sent to user ${recipientId}`);
      } catch (error) {
        // Don't fail message sending if notification fails
        this.logger.error(`Error sending notification: ${error.message}`);
      }

      return savedMessage;
    } catch (error) {
      this.logger.error(`Error sending direct message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get messages in a conversation with pagination
   * @param conversationId - Conversation ID
   * @param userId - User ID requesting (for authorization)
   * @param limit - Number of messages to retrieve
   * @param before - Message ID for cursor-based pagination
   * @returns Array of messages
   */
  async getMessages(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    limit: number = 50,
    before?: string,
  ): Promise<DirectMessageDocument[]> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      // Verify user is participant
      const conversation = await this.conversationModel.findById(conversationObjectId);
      if (!conversation) {
        throw new NotFoundException('Conversation not found');
      }

      const isParticipant = conversation.participants.some((p) => p.equals(userObjectId));
      if (!isParticipant) {
        throw new ForbiddenException('You are not a participant in this conversation');
      }

      // Build query
      const query: any = {
        conversationId: conversationObjectId,
        isDeleted: false,
      };

      // Cursor-based pagination
      if (before) {
        const beforeMessage = await this.directMessageModel.findById(before);
        if (beforeMessage && beforeMessage.createdAt) {
          query.createdAt = { $lt: beforeMessage.createdAt };
        }
      }

      const messages = await this.directMessageModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'name email avatar')
        .populate('recipientId', 'name email avatar')
        .populate('replyTo')
        .exec();

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      this.logger.error(`Error getting messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark all messages in a conversation as read
   * @param conversationId - Conversation ID
   * @param userId - User ID marking as read
   */
  async markConversationAsRead(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<void> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      // Update all unread messages where user is recipient
      const result = await this.directMessageModel.updateMany(
        {
          conversationId: conversationObjectId,
          recipientId: userObjectId,
          isRead: false,
        },
        {
          $set: {
            isRead: true,
            readAt: new Date(),
            status: MessageStatus.READ,
          },
        },
      );

      // Reset unread count for this user in conversation
      await this.conversationModel.findByIdAndUpdate(conversationObjectId, {
        [`unreadCount.${userObjectId.toString()}`]: 0,
        [`lastReadAt.${userObjectId.toString()}`]: new Date(),
      });

      this.logger.log(
        `Marked ${result.modifiedCount} messages as read in conversation ${conversationId} for user ${userId}`,
      );
    } catch (error) {
      this.logger.error(`Error marking conversation as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get unread message count for a user in a conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @returns Unread message count
   */
  async getUnreadCount(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<number> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      const count = await this.directMessageModel.countDocuments({
        conversationId: conversationObjectId,
        recipientId: userObjectId,
        isRead: false,
        isDeleted: false,
      });

      return count;
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete/archive conversation for a user (soft delete)
   * @param conversationId - Conversation ID
   * @param userId - User ID
   */
  async deleteConversationForUser(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<void> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      await this.conversationModel.findByIdAndUpdate(conversationObjectId, {
        [`deletedBy.${userObjectId.toString()}`]: true,
      });

      this.logger.log(`Conversation ${conversationId} deleted for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mute/unmute conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @param muted - Mute status
   */
  async muteConversation(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    muted: boolean,
  ): Promise<void> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      await this.conversationModel.findByIdAndUpdate(conversationObjectId, {
        [`mutedBy.${userObjectId.toString()}`]: muted,
      });

      this.logger.log(`Conversation ${conversationId} ${muted ? 'muted' : 'unmuted'} for user ${userId}`);
    } catch (error) {
      this.logger.error(`Error muting conversation: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate message content based on type
   * @param dto - Message DTO
   */
  private validateMessageContent(dto: Partial<SendDirectMessageDto>): void {
    switch (dto.type) {
      case DirectMessageType.TEXT:
        if (!dto.content || dto.content.trim().length === 0) {
          throw new BadRequestException('Text messages must have content');
        }
        break;

      case DirectMessageType.IMAGE:
      case DirectMessageType.VIDEO:
      case DirectMessageType.AUDIO:
      case DirectMessageType.FILE:
        if (!dto.mediaUrl) {
          throw new BadRequestException(`${dto.type} messages must have a mediaUrl`);
        }
        break;

      case DirectMessageType.LOCATION:
        if (!dto.location || !dto.location.latitude || !dto.location.longitude) {
          throw new BadRequestException('Location messages must have latitude and longitude');
        }
        break;

      default:
        throw new BadRequestException('Invalid message type');
    }
  }

  /**
   * Check if user is participant in conversation
   * @param conversationId - Conversation ID
   * @param userId - User ID
   * @returns True if participant, false otherwise
   */
  async isUserParticipant(
    conversationId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<boolean> {
    try {
      const conversationObjectId = new Types.ObjectId(conversationId);
      const userObjectId = new Types.ObjectId(userId);

      const conversation = await this.conversationModel.findById(conversationObjectId);
      if (!conversation) {
        return false;
      }

      return conversation.participants.some((p) => p.equals(userObjectId));
    } catch (error) {
      this.logger.error(`Error checking participant: ${error.message}`);
      return false;
    }
  }
}
