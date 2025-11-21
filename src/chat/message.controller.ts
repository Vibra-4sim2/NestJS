import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/message.dto';
import { GetMessagesDto } from './dto/query.dto';

/**
 * MessageController
 * REST API endpoints for message operations
 */
@ApiTags('messages')
@ApiBearerAuth('JWT')
@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  /**
   * Get messages for a chat by sortie ID
   * GET /messages/sortie/:sortieId
   * @param sortieId - The ID of the sortie
   * @param query - Pagination parameters
   * @param req - Request object
   * @returns Paginated messages
   */
  @Get('sortie/:sortieId')
  async getMessagesBySortie(
    @Param('sortieId') sortieId: string,
    @Query() query: GetMessagesDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.messageService.getMessages(sortieId, userId, query);
  }

  /**
   * Get messages for a chat by chat ID
   * GET /messages/chat/:chatId
   * @param chatId - The ID of the chat
   * @param query - Pagination parameters
   * @param req - Request object
   * @returns Paginated messages
   */
  @Get('chat/:chatId')
  async getMessagesByChatId(
    @Param('chatId') chatId: string,
    @Query() query: GetMessagesDto,
    @Request() req: any,
  ) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    return this.messageService.getMessagesByChatId(chatId, userId, query);
  }

  /**
   * Send a message via REST API (alternative to WebSocket)
   * POST /messages/sortie/:sortieId
   * @param sortieId - The ID of the sortie
   * @param dto - Message data
   * @param req - Request object
   * @returns Created message
   */
  @Post('sortie/:sortieId')
  async sendMessage(
    @Param('sortieId') sortieId: string,
    @Body() dto: CreateMessageDto,
    @Request() req: any,
  ) {
    console.log('🔍 req.user:', req.user);
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    console.log('🔍 Extracted userId:', userId);
    return this.messageService.sendMessage(sortieId, userId, dto);
  }

  /**
   * Upload media file (image, video, audio) to Cloudinary
   * POST /messages/upload
   * @param file - The uploaded file
   * @param req - Request object
   * @returns Upload result with URL
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(@UploadedFile() file: Express.Multer.File, @Request() req: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Determine resource type based on MIME type
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';

    if (file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      resourceType = 'video'; // Cloudinary uses 'video' for both video and audio
    } else {
      resourceType = 'raw'; // For other file types
    }

    const result = await this.messageService.uploadToCloudinary(file, resourceType);

    return {
      success: true,
      url: result.secureUrl,
      publicId: result.publicId,
      duration: result.duration,
      format: result.format,
      mimeType: file.mimetype,
      size: file.size,
      originalName: file.originalname,
    };
  }

  /**
   * Get a specific message by ID
   * GET /messages/:messageId
   * @param messageId - The ID of the message
   * @returns Message document
   */
  @Get(':messageId')
  async getMessageById(@Param('messageId') messageId: string) {
    return this.messageService.getMessageById(messageId);
  }

  /**
   * Delete a message (soft delete)
   * DELETE /messages/:messageId
   * @param messageId - The ID of the message
   * @param req - Request object
   */
  @Delete(':messageId')
  async deleteMessage(@Param('messageId') messageId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    await this.messageService.deleteMessage(messageId, userId);
    return { success: true, message: 'Message deleted successfully' };
  }

  /**
   * Mark a message as read
   * POST /messages/:messageId/read
   * @param messageId - The ID of the message
   * @param req - Request object
   */
  @Post(':messageId/read')
  async markAsRead(@Param('messageId') messageId: string, @Request() req: any) {
    const userId = req.user?.userId || req.user?.sub || req.user?.id;
    await this.messageService.markAsRead(messageId, userId);
    return { success: true, message: 'Message marked as read' };
  }
}
