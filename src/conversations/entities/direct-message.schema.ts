import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DirectMessageDocument = DirectMessage & Document;

/**
 * Message Type Enum for Direct Messages
 */
export enum DirectMessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  LOCATION = 'location',
}

/**
 * Message Status Enum
 * Tracks delivery and read status
 */
export enum MessageStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
}

/**
 * DirectMessage Schema
 * Represents individual messages in a private conversation
 * Supports text, media (images, videos, audio), files, and location
 */
@Schema({ timestamps: true })
export class DirectMessage {
  /**
   * Reference to the conversation this message belongs to
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true,
  })
  conversationId: Types.ObjectId;

  /**
   * User who sent this message
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  senderId: Types.ObjectId;

  /**
   * User who receives this message
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  recipientId: Types.ObjectId;

  /**
   * Type of message
   */
  @Prop({
    type: String,
    enum: Object.values(DirectMessageType),
    required: true,
    default: DirectMessageType.TEXT,
  })
  type: DirectMessageType;

  /**
   * Text content
   * Required for text messages, optional for media (can be caption)
   */
  @Prop({ type: String, required: false })
  content?: string;

  /**
   * URL to media file (image, video, audio, file)
   * Typically a Cloudinary URL or similar CDN
   */
  @Prop({ type: String, required: false })
  mediaUrl?: string;

  /**
   * Thumbnail URL for videos/images
   */
  @Prop({ type: String, required: false })
  thumbnailUrl?: string;

  /**
   * Duration in seconds for audio/video messages
   */
  @Prop({ type: Number, required: false })
  mediaDuration?: number;

  /**
   * File size in bytes
   */
  @Prop({ type: Number, required: false })
  fileSize?: number;

  /**
   * Original filename
   */
  @Prop({ type: String, required: false })
  fileName?: string;

  /**
   * MIME type of the media/file
   */
  @Prop({ type: String, required: false })
  mimeType?: string;

  /**
   * Location data for location messages
   */
  @Prop({
    type: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      address: { type: String, required: false },
      name: { type: String, required: false },
    },
    required: false,
  })
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
    name?: string;
  };

  /**
   * Message read status (simple boolean for 1-on-1)
   */
  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  /**
   * When the message was read
   */
  @Prop({ type: Date, required: false })
  readAt?: Date;

  /**
   * Message delivery/read status
   */
  @Prop({
    type: String,
    enum: Object.values(MessageStatus),
    default: MessageStatus.SENT,
  })
  status: MessageStatus;

  /**
   * Soft delete flag
   */
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  /**
   * Reference to message being replied to
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'DirectMessage',
    required: false,
  })
  replyTo?: Types.ObjectId;

  /**
   * Temporary ID from client (for optimistic updates)
   */
  @Prop({ type: String, required: false })
  tempId?: string;

  // Timestamps added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const DirectMessageSchema = SchemaFactory.createForClass(DirectMessage);

// Indexes for efficient queries
DirectMessageSchema.index({ conversationId: 1, createdAt: -1 }); // Get messages by conversation
DirectMessageSchema.index({ senderId: 1 });
DirectMessageSchema.index({ recipientId: 1, isRead: 1 }); // Unread messages
DirectMessageSchema.index({ createdAt: -1 }); // Sort by time
