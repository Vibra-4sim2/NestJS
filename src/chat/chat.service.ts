import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Chat, ChatDocument } from './entities/chat.schema';
import { Message, MessageDocument, MessageType } from './entities/message.schema';

/**
 * ChatService
 * Handles all chat-related operations including creation, member management, and queries
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<ChatDocument>,
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Create a new chat for a Sortie
   * Called automatically when a Sortie is created
   * @param sortieId - The ID of the sortie
   * @param creatorId - The ID of the user creating the sortie (becomes first member)
   * @param sortieName - Optional name for the chat (defaults to sortie title)
   * @returns The created chat document
   */
  async createChatForSortie(
    sortieId: string | Types.ObjectId,
    creatorId: string | Types.ObjectId,
    sortieName?: string,
  ): Promise<ChatDocument> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const creatorObjectId = new Types.ObjectId(creatorId);

      // Check if chat already exists for this sortie
      const existingChat = await this.chatModel.findOne({ sortieId: sortieObjectId });
      if (existingChat) {
        this.logger.warn(`Chat already exists for sortie ${sortieId}`);
        throw new ConflictException('Chat already exists for this sortie');
      }

      // Create the chat with creator as first member
      const chat = new this.chatModel({
        sortieId: sortieObjectId,
        members: [creatorObjectId],
        name: sortieName,
      });

      const savedChat = await chat.save();
      this.logger.log(`Chat created for sortie ${sortieId} with creator ${creatorId}`);

      // Create a welcome system message
      await this.createSystemMessage(
        savedChat._id as Types.ObjectId,
        sortieObjectId,
        'Chat créé automatiquement pour cette sortie. Bienvenue !',
      );

      return savedChat;
    } catch (error) {
      this.logger.error(`Error creating chat for sortie ${sortieId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add a user to a chat group
   * Called when a user joins a sortie (participation accepted)
   * @param sortieId - The ID of the sortie
   * @param userId - The ID of the user to add
   * @returns The updated chat document
   */
  async addUserToChat(
    sortieId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<ChatDocument> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);

      // Find the chat for this sortie
      const chat = await this.chatModel.findOne({ sortieId: sortieObjectId });
      if (!chat) {
        this.logger.error(`Chat not found for sortie ${sortieId}`);
        throw new NotFoundException('Chat not found for this sortie');
      }

      // Check if user is already a member (avoid duplicates)
      const isMember = chat.members.some((member) => member.equals(userObjectId));
      if (isMember) {
        this.logger.log(`User ${userId} is already a member of chat for sortie ${sortieId}`);
        return chat;
      }

      // Add user to members array
      chat.members.push(userObjectId);
      const updatedChat = await chat.save();

      this.logger.log(`User ${userId} added to chat for sortie ${sortieId}`);

      // Create a system message announcing the new member
      await this.createSystemMessage(
        chat._id as Types.ObjectId,
        sortieObjectId,
        'Un nouveau participant a rejoint la sortie',
      );

      return updatedChat;
    } catch (error) {
      this.logger.error(`Error adding user ${userId} to chat for sortie ${sortieId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Remove a user from a chat group
   * Called when a user leaves/is removed from a sortie
   * @param sortieId - The ID of the sortie
   * @param userId - The ID of the user to remove
   * @returns The updated chat document
   */
  async removeUserFromChat(
    sortieId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<ChatDocument> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);

      const chat = await this.chatModel.findOne({ sortieId: sortieObjectId });
      if (!chat) {
        throw new NotFoundException('Chat not found for this sortie');
      }

      // Remove user from members array
      chat.members = chat.members.filter((member) => !member.equals(userObjectId));
      const updatedChat = await chat.save();

      this.logger.log(`User ${userId} removed from chat for sortie ${sortieId}`);

      // Create a system message
      await this.createSystemMessage(
        chat._id as Types.ObjectId,
        sortieObjectId,
        'Un participant a quitté la sortie',
      );

      return updatedChat;
    } catch (error) {
      this.logger.error(`Error removing user ${userId} from chat: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat by Sortie ID
   * @param sortieId - The ID of the sortie
   * @returns The chat document with populated members and last message
   */
  async getChatBySortie(sortieId: string | Types.ObjectId): Promise<ChatDocument> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);

      const chat = await this.chatModel
        .findOne({ sortieId: sortieObjectId })
        .populate('members', 'firstName lastName email avatar')
        .populate('lastMessage')
        .exec();

      if (!chat) {
        this.logger.error(`Chat not found for sortie ${sortieId}`);
        throw new NotFoundException('Chat not found for this sortie');
      }

      return chat;
    } catch (error) {
      this.logger.error(`Error fetching chat for sortie ${sortieId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get chat by Chat ID
   * @param chatId - The ID of the chat
   * @returns The chat document with populated fields
   */
  async getChatById(chatId: string | Types.ObjectId): Promise<ChatDocument> {
    try {
      const chatObjectId = new Types.ObjectId(chatId);

      const chat = await this.chatModel
        .findById(chatObjectId)
        .populate('members', 'firstName lastName email avatar')
        .populate('lastMessage')
        .exec();

      if (!chat) {
        throw new NotFoundException('Chat not found');
      }

      return chat;
    } catch (error) {
      this.logger.error(`Error fetching chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all members of a chat
   * @param sortieId - The ID of the sortie
   * @returns Array of user IDs who are members
   */
  async getChatMembers(sortieId: string | Types.ObjectId): Promise<Types.ObjectId[]> {
    try {
      const chat = await this.getChatBySortie(sortieId);
      return chat.members;
    } catch (error) {
      this.logger.error(`Error fetching chat members for sortie ${sortieId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if a user is a member of a chat
   * @param sortieId - The ID of the sortie
   * @param userId - The ID of the user to check
   * @returns True if user is a member, false otherwise
   */
  async isUserMember(
    sortieId: string | Types.ObjectId,
    userId: string | Types.ObjectId,
  ): Promise<boolean> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);
      const userObjectId = new Types.ObjectId(userId);

      console.log('🔍 isUserMember check:');
      console.log('  sortieId:', sortieId, '→', sortieObjectId);
      console.log('  userId:', userId, '→', userObjectId);

      const chat = await this.chatModel.findOne({ sortieId: sortieObjectId });
      if (!chat) {
        console.log('  ❌ No chat found for sortie');
        return false;
      }

      console.log('  Chat members:', chat.members);
      const isMember = chat.members.some((member) => member.equals(userObjectId));
      console.log('  isMember result:', isMember);

      return isMember;
    } catch (error) {
      this.logger.error(`Error checking membership: ${error.message}`);
      console.error('  Error:', error);
      return false;
    }
  }

  /**
   * Update last message reference in chat
   * Called by MessageService after creating a new message
   * @param chatId - The ID of the chat
   * @param messageId - The ID of the last message
   */
  async updateLastMessage(
    chatId: string | Types.ObjectId,
    messageId: string | Types.ObjectId,
  ): Promise<void> {
    try {
      const chatObjectId = new Types.ObjectId(chatId);
      const messageObjectId = new Types.ObjectId(messageId);

      await this.chatModel.findByIdAndUpdate(chatObjectId, {
        lastMessage: messageObjectId,
      });

      this.logger.log(`Updated last message for chat ${chatId}`);
    } catch (error) {
      this.logger.error(`Error updating last message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all chats where a user is a member
   * @param userId - The ID of the user
   * @param limit - Maximum number of chats to return
   * @returns Array of chat documents
   */
  async getUserChats(userId: string | Types.ObjectId, limit: number = 20): Promise<ChatDocument[]> {
    try {
      const userObjectId = new Types.ObjectId(userId);

      const chats = await this.chatModel
        .find({ members: userObjectId })
        .populate('members', 'firstName lastName email avatar')
        .populate('lastMessage')
        .populate('sortieId', 'titre date type')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();

      return chats;
    } catch (error) {
      this.logger.error(`Error fetching chats for user ${userId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a system message (not sent by any user)
   * Used for notifications like "User joined", "Chat created", etc.
   * @param chatId - The ID of the chat
   * @param sortieId - The ID of the sortie
   * @param content - The message content
   */
  private async createSystemMessage(
    chatId: Types.ObjectId,
    sortieId: Types.ObjectId,
    content: string,
  ): Promise<MessageDocument> {
    try {
      const message = new this.messageModel({
        chatId,
        sortieId,
        senderId: null, // System messages have no sender
        type: MessageType.SYSTEM,
        content,
      });

      const savedMessage = await message.save();

      // Update last message in chat
      await this.updateLastMessage(chatId, savedMessage._id as Types.ObjectId);

      return savedMessage;
    } catch (error) {
      this.logger.error(`Error creating system message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create a poll message
   * Used when a poll is created - creates a message that references the poll
   * @param chatId - The ID of the chat
   * @param sortieId - The ID of the sortie
   * @param senderId - The ID of the user who created the poll
   * @param pollId - The ID of the poll
   * @returns The populated message document with sender and poll data
   */
  async createPollMessage(
    chatId: Types.ObjectId,
    sortieId: Types.ObjectId,
    senderId: Types.ObjectId,
    pollId: Types.ObjectId,
  ): Promise<any> {
    try {
      const message = new this.messageModel({
        chatId,
        sortieId,
        senderId,
        type: MessageType.POLL,
        pollId,
      });

      const savedMessage = await message.save();

      // Update last message in chat
      await this.updateLastMessage(chatId, savedMessage._id as Types.ObjectId);

      // Populate sender and poll data for the response
      const populatedMessage = await this.messageModel
        .findById(savedMessage._id)
        .populate('senderId', 'firstName lastName email avatar')
        .populate('pollId')
        .exec();

      this.logger.log(`Poll message created: ${savedMessage._id} for poll ${pollId}`);

      return populatedMessage;
    } catch (error) {
      this.logger.error(`Error creating poll message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete a chat (when sortie is deleted)
   * @param sortieId - The ID of the sortie
   */
  async deleteChatBySortie(sortieId: string | Types.ObjectId): Promise<void> {
    try {
      const sortieObjectId = new Types.ObjectId(sortieId);

      const chat = await this.chatModel.findOne({ sortieId: sortieObjectId });
      if (!chat) {
        this.logger.warn(`No chat found for sortie ${sortieId}`);
        return;
      }

      // Delete all messages in this chat
      await this.messageModel.deleteMany({ chatId: chat._id });

      // Delete the chat
      await this.chatModel.findByIdAndDelete(chat._id);

      this.logger.log(`Deleted chat and messages for sortie ${sortieId}`);
    } catch (error) {
      this.logger.error(`Error deleting chat for sortie ${sortieId}: ${error.message}`);
      throw error;
    }
  }
}
