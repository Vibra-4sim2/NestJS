import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatDocument = Chat & Document;

/**
 * Chat Schema
 * Represents a group chat linked to a Sortie (1:1 relationship)
 * Members include the creator and all accepted participants
 */
@Schema({ timestamps: true })
export class Chat {
  /**
   * Reference to the Sortie this chat belongs to
   * Each chat is linked to exactly one Sortie
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Sortie',
    required: true,
    unique: true, // Ensures 1:1 relationship
    index: true,
  })
  sortieId: Types.ObjectId;

  /**
   * Array of user IDs who are members of this chat
   * Initially contains only the creator, grows as participants join
   */
  @Prop({
    type: [Types.ObjectId],
    ref: 'User',
    default: [],
    index: true,
  })
  members: Types.ObjectId[];

  /**
   * Reference to the last message sent in this chat
   * Useful for displaying chat previews
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'Message',
    default: null,
  })
  lastMessage?: Types.ObjectId;

  /**
   * Optional chat name (defaults to sortie title)
   */
  @Prop({ type: String, required: false })
  name?: string;

  /**
   * Optional chat avatar/image
   */
  @Prop({ type: String, required: false })
  avatar?: string;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);

// Indexes for efficient lookups
ChatSchema.index({ sortieId: 1 }); // Find chat by sortie
ChatSchema.index({ members: 1 }); // Find chats where user is a member
ChatSchema.index({ updatedAt: -1 }); // Sort by last activity
