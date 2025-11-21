import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/message.dto';
import { GetMessagesDto } from './dto/query.dto';

/**
 * ChatController
 * REST API endpoints for chat management
 */
@ApiTags('chats')
@ApiBearerAuth('JWT')
@Controller('chats')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly messageService: MessageService,
  ) {}

  /**
   * Get chat for a specific sortie
   * GET /chats/sortie/:sortieId
   * @param sortieId - The ID of the sortie
   * @param req - Request object containing authenticated user
   * @returns Chat document with members and last message
   */
  @Get('sortie/:sortieId')
  async getChatBySortie(@Param('sortieId') sortieId: string, @Request() req: any) {
    // Extract user ID from JWT (set by auth guard)
    const userId = req.user?.userId || req.user?.sub || req.user?.id;

    // Verify user is a member before returning chat details
    const isMember = await this.chatService.isUserMember(sortieId, userId);
    if (!isMember) {
      throw new BadRequestException('You are not a member of this chat');
    }

    return this.chatService.getChatBySortie(sortieId);
  }

  /**
   * Get chat by ID
   * GET /chats/:chatId
   * @param chatId - The ID of the chat
   * @param req - Request object
   * @returns Chat document
   */
  @Get(':chatId')
  async getChatById(@Param('chatId') chatId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    const chat = await this.chatService.getChatById(chatId);

    // Verify membership
    const isMember = chat.members.some((member) => member.toString() === userId.toString());
    if (!isMember) {
      throw new BadRequestException('You are not a member of this chat');
    }

    return chat;
  }

  /**
   * Get all chats where user is a member
   * GET /chats
   * @param req - Request object
   * @returns Array of chat documents
   */
  @Get()
  async getUserChats(@Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.chatService.getUserChats(userId);
  }

  /**
   * Get members of a chat
   * GET /chats/sortie/:sortieId/members
   * @param sortieId - The ID of the sortie
   * @returns Array of user IDs
   */
  @Get('sortie/:sortieId/members')
  async getChatMembers(@Param('sortieId') sortieId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;

    const isMember = await this.chatService.isUserMember(sortieId, userId);
    if (!isMember) {
      throw new BadRequestException('You are not a member of this chat');
    }

    return this.chatService.getChatMembers(sortieId);
  }
}
