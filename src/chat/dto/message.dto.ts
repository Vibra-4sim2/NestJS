import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../entities/message.schema';

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
 * DTO for creating/sending a message
 */
export class CreateMessageDto {
  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;

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
}

/**
 * DTO for WebSocket send message event
 */
export class SendMessageWsDto {
  @IsString()
  @IsNotEmpty()
  sortieId: string;

  @IsEnum(MessageType)
  @IsNotEmpty()
  type: MessageType;

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
  replyTo?: string;
}

/**
 * DTO for joining a chat room via WebSocket
 */
export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  sortieId: string;
}

/**
 * DTO for typing indicator
 */
export class TypingDto {
  @IsString()
  @IsNotEmpty()
  sortieId: string;

  @IsString()
  @IsNotEmpty()
  isTyping: boolean;
}
