import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

/**
 * Message Type Enum
 * Defines all supported message types in the chat
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  FILE = 'file',
  LOCATION = 'location',
  SYSTEM = 'system', // For system messages like "User joined the chat"
}

/**
 * Message Schema
 * Represents individual messages in a chat
 * Supports text, media (images, videos, audio), files, and location
 */
@Schema({ timestamps: true })
export class Message {
  /**
   * Reference to the chat this message belongs to
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true,
  })
  chatId: Types.ObjectId;

  /**
   * Reference to the sortie (for easier queries)
   * Denormalized for performance - matches chat.sortieId
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Sortie',
    required: true,
    index: true,
  })
  sortieId: Types.ObjectId;

  /**
   * Reference to the user who sent this message
   * Null for system messages
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: false,
    default: null,
  })
  senderId: Types.ObjectId;

  /**
   * Type of message (text, image, video, audio, file, location, system)
   */
  @Prop({
    type: String,
    enum: Object.values(MessageType),
    required: true,
    default: MessageType.TEXT,
  })
  type: MessageType;

  /**
   * Text content of the message
   * Required for text messages, optional for media messages (can contain captions)
   */
  @Prop({ type: String, required: false })
  content?: string;

  /**
   * URL to media file (image, video, audio, file)
   * Typically a Cloudinary URL
   */
  @Prop({ type: String, required: false })
  mediaUrl?: string;

  /**
   * Thumbnail URL for videos/images (optional)
   */
  @Prop({ type: String, required: false })
  thumbnailUrl?: string;

  /**
   * Duration in seconds for audio/video messages
   */
  @Prop({ type: Number, required: false })
  mediaDuration?: number;

  /**
   * File size in bytes (for file type messages)
   */
  @Prop({ type: Number, required: false })
  fileSize?: number;

  /**
   * Original filename (for file type messages)
   */
  @Prop({ type: String, required: false })
  fileName?: string;

  /**
   * MIME type of the media/file
   */
  @Prop({ type: String, required: false })
  mimeType?: string;

  /**
   * Location data for location type messages
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
   * Message read status tracking
   * Array of user IDs who have read this message
   */
  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    default: [],
  })
  readBy: Types.ObjectId[];

  /**
   * Soft delete flag
   * Marks message as deleted without actually removing it
   */
  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  /**
   * Reply to another message (threading support)
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Message',
    required: false,
  })
  replyTo?: Types.ObjectId;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Compound index for efficient message retrieval
// Sort by chatId and createdAt for paginated queries
MessageSchema.index({ chatId: 1, createdAt: -1 });
MessageSchema.index({ sortieId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, createdAt: -1 });
