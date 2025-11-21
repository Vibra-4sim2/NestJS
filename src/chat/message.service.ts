import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument, MessageType } from './entities/message.schema';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto/message.dto';
import { GetMessagesDto } from './dto/query.dto';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

/**
 * MessageService
 * Handles all message operations including sending, retrieving, and media uploads
 */
@Injectable()
export class MessageService {
  private readonly logger = new Logger(MessageService.name);

  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    private chatService: ChatService,
  ) {}

  /**
   * Send a message in a chat
   * Validates permissions, saves message, updates chat's lastMessage
   * @param sortieId - The ID of the sortie
   * @param senderId - The ID of the user sending the message
   * @param dto - Message data
   * @returns The created message document
   */
  async sendMessage(
    sortieId: string | Types.ObjectId,
    senderId: string | Types.ObjectId,
    dto: CreateMessageDto,
  ): Promise<MessageDocument> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const senderObjectId = new Types.ObjectId(senderId);

      // Get the chat for this sortie
      const chat = await this.chatService.getChatBySortie(sortieObjectId);

      // Validate that sender is a member of the chat
      const isMember = await this.chatService.isUserMember(sortieObjectId, senderObjectId);
      if (!isMember) {
        this.logger.warn(`User ${senderId} attempted to send message but is not a member of chat for sortie ${sortieId}`);
        throw new ForbiddenException('You are not a member of this chat');
      }

      // Validate message content based on type
      this.validateMessageContent(dto);

      // Create the message
      const message = new this.messageModel({
        chatId: chat._id,
        sortieId: sortieObjectId,
        senderId: senderObjectId,
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
      });

      const savedMessage = await message.save();

      // Populate sender information
      await savedMessage.populate('senderId', 'firstName lastName email avatar');

      // Update chat's last message
      await this.chatService.updateLastMessage(chat._id as Types.ObjectId, savedMessage._id as Types.ObjectId);

      this.logger.log(`Message sent in chat for sortie ${sortieId} by user ${senderId}`);

      return savedMessage;
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get recent messages for a chat
   * @param sortieId - The ID of the sortie
   * @param userId - The ID of the user requesting messages (for permission check)
   * @param limit - Number of recent messages to retrieve
   * @returns Array of message documents
   */
  async getRecentMessages(
    sortieId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    limit: number = 50,
  ): Promise<MessageDocument[]> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);

      // Verify user is a member of this chat
      const isMember = await this.chatService.isUserMember(sortieObjectId, userObjectId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this chat');
      }

      const chat = await this.chatService.getChatBySortie(sortieObjectId);

      const messages = await this.messageModel
        .find({ chatId: chat._id, isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'firstName lastName email avatar')
        .populate('replyTo')
        .exec();

      // Return in chronological order (oldest first)
      return messages.reverse();
    } catch (error) {
      this.logger.error(`Error fetching recent messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get paginated messages for a chat
   * @param sortieId - The ID of the sortie
   * @param userId - The ID of the user requesting messages
   * @param query - Pagination parameters
   * @returns Paginated messages with metadata
   */
  async getMessages(
    sortieId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    query: GetMessagesDto,
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number; hasMore: boolean }> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);

      // Verify user is a member
      const isMember = await this.chatService.isUserMember(sortieObjectId, userObjectId);
      if (!isMember) {
        throw new ForbiddenException('You are not a member of this chat');
      }

      const chat = await this.chatService.getChatBySortie(sortieObjectId);

      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      // Build query
      const messageQuery: any = { chatId: chat._id, isDeleted: false };

      // Cursor-based pagination (if before cursor is provided)
      if (query.before) {
        const beforeMessage = await this.messageModel.findById(query.before);
        if (beforeMessage) {
          messageQuery.createdAt = { $lt: (beforeMessage as any).createdAt };
        }
      }

      const total = await this.messageModel.countDocuments(messageQuery);

      const messages = await this.messageModel
        .find(messageQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'firstName lastName email avatar')
        .populate('replyTo')
        .exec();

      const hasMore = skip + messages.length < total;

      return {
        messages: messages.reverse(), // Chronological order
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Error fetching paginated messages: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get messages by chat ID (for REST API)
   * @param chatId - The ID of the chat
   * @param userId - The ID of the user requesting messages
   * @param query - Pagination parameters
   */
  async getMessagesByChatId(
    chatId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
    query: GetMessagesDto,
  ): Promise<{ messages: MessageDocument[]; total: number; page: number; limit: number; hasMore: boolean }> {
    try {
      const chatObjectId = new Types.ObjectId(chatId);
      const userObjectId = new Types.ObjectId(userId);

      // Get chat and verify membership
      const chat = await this.chatService.getChatById(chatObjectId);
      const isMember = chat.members.some((member) => member.equals(userObjectId));

      if (!isMember) {
        throw new ForbiddenException('You are not a member of this chat');
      }

      const page = query.page || 1;
      const limit = query.limit || 50;
      const skip = (page - 1) * limit;

      const messageQuery: any = { chatId: chatObjectId, isDeleted: false };

      if (query.before) {
        const beforeMessage = await this.messageModel.findById(query.before);
        if (beforeMessage) {
          messageQuery.createdAt = { $lt: (beforeMessage as any).createdAt };
        }
      }

      const total = await this.messageModel.countDocuments(messageQuery);

      const messages = await this.messageModel
        .find(messageQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'firstName lastName email avatar')
        .populate('replyTo')
        .exec();

      const hasMore = skip + messages.length < total;

      return {
        messages: messages.reverse(),
        total,
        page,
        limit,
        hasMore,
      };
    } catch (error) {
      this.logger.error(`Error fetching messages by chat ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mark a message as read by a user
   * @param messageId - The ID of the message
   * @param userId - The ID of the user who read it
   */
  async markAsRead(messageId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<void> {
    try {
      const messageObjectId = new Types.ObjectId(messageId);
      const userObjectId = new Types.ObjectId(userId);

      await this.messageModel.findByIdAndUpdate(messageObjectId, {
        $addToSet: { readBy: userObjectId },
      });

      this.logger.log(`Message ${messageId} marked as read by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error marking message as read: ${error.message}`);
      throw error;
    }
  }

  /**
   * Soft delete a message
   * @param messageId - The ID of the message
   * @param userId - The ID of the user deleting (must be sender)
   */
  async deleteMessage(messageId: string | Types.ObjectId, userId: string | Types.ObjectId): Promise<void> {
    try {
      const messageObjectId = new Types.ObjectId(messageId);
      const userObjectId = new Types.ObjectId(userId);

      const message = await this.messageModel.findById(messageObjectId);
      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Only sender can delete their own message
      if (!message.senderId.equals(userObjectId)) {
        throw new ForbiddenException('You can only delete your own messages');
      }

      message.isDeleted = true;
      await message.save();

      this.logger.log(`Message ${messageId} soft deleted by user ${userId}`);
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload media file to Cloudinary
   * @param file - The uploaded file buffer
   * @param resourceType - 'image', 'video', 'raw', or 'auto'
   * @returns Cloudinary upload result with URL
   */
  async uploadToCloudinary(
    file: Express.Multer.File,
    resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
  ): Promise<{ url: string; secureUrl: string; publicId: string; duration?: number; format: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'chat-media',
        },
        (error, result) => {
          if (error || !result) {
            this.logger.error(`Cloudinary upload error: ${error?.message || 'Unknown error'}`);
            reject(new BadRequestException('File upload failed'));
          } else {
            resolve({
              url: result.url,
              secureUrl: result.secure_url,
              publicId: result.public_id,
              duration: result.duration, // For audio/video
              format: result.format,
            });
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  /**
   * Validate message content based on type
   * @param dto - Message DTO to validate
   */
  private validateMessageContent(dto: CreateMessageDto): void {
    switch (dto.type) {
      case MessageType.TEXT:
        if (!dto.content || dto.content.trim().length === 0) {
          throw new BadRequestException('Text messages must have content');
        }
        break;

      case MessageType.IMAGE:
      case MessageType.VIDEO:
      case MessageType.AUDIO:
      case MessageType.FILE:
        if (!dto.mediaUrl) {
          throw new BadRequestException(`${dto.type} messages must have a mediaUrl`);
        }
        break;

      case MessageType.LOCATION:
        if (!dto.location || !dto.location.latitude || !dto.location.longitude) {
          throw new BadRequestException('Location messages must have latitude and longitude');
        }
        break;

      case MessageType.SYSTEM:
        // System messages are created internally only
        throw new BadRequestException('Cannot send system messages via API');

      default:
        throw new BadRequestException('Invalid message type');
    }
  }

  /**
   * Get message by ID
   * @param messageId - The ID of the message
   * @returns The message document
   */
  async getMessageById(messageId: string | Types.ObjectId): Promise<MessageDocument> {
    try {
      const messageObjectId = new Types.ObjectId(messageId);

      const message = await this.messageModel
        .findById(messageObjectId)
        .populate('senderId', 'firstName lastName email avatar')
        .populate('replyTo')
        .exec();

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      return message;
    } catch (error) {
      this.logger.error(`Error fetching message ${messageId}: ${error.message}`);
      throw error;
    }
  }
}
