import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { DirectMessageType } from '../entities/direct-message.schema';

/**
 * DTO for location data in messages
 */
export class LocationDto {
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @IsNumber()
  @IsNotEmpty()
  longitude: number;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  name?: string;
}

/**
 * DTO for initiating a conversation with another user
 */
export class InitiateConversationDto {
  @IsString()
  @IsNotEmpty()
  recipientId: string;
}

/**
 * DTO for sending a direct message
 */
export class SendDirectMessageDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsEnum(DirectMessageType)
  @IsNotEmpty()
  type: DirectMessageType;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  mediaUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;

  @IsNumber()
  @IsOptional()
  mediaDuration?: number;

  @IsNumber()
  @IsOptional()
  fileSize?: number;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  mimeType?: string;

  @ValidateNested()
  @Type(() => LocationDto)
  @IsOptional()
  location?: LocationDto;

  @IsString()
  @IsOptional()
  replyTo?: string; // Message ID being replied to

  @IsString()
  @IsOptional()
  tempId?: string; // Temporary ID from client for optimistic updates
}

/**
 * DTO for marking conversation as read
 */
export class MarkAsReadDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}

/**
 * DTO for typing indicator
 */
export class TypingIndicatorDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsNotEmpty()
  isTyping: boolean;
}

/**
 * DTO for getting messages with pagination
 */
export class GetMessagesDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number = 50;

  @IsString()
  @IsOptional()
  before?: string; // Message ID for cursor-based pagination
}

/**
 * DTO for deleting/archiving conversation
 */
export class DeleteConversationDto {
  @IsString()
  @IsNotEmpty()
  conversationId: string;
}
