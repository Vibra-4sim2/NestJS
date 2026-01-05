import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

/**
 * Conversation Schema
 * Represents a private one-on-one conversation between exactly two users
 * Completely separate from group chats (sortie-based)
 */
@Schema({ 
  timestamps: true,
  autoIndex: false  // CRITICAL: Disable auto-index creation
})
export class Conversation {
  /**
   * Two participants - exactly 2 users, no more, no less
   * This is NOT a group chat - it's always user-to-user
   */
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: {
      validator: (arr: Types.ObjectId[]) => arr.length === 2,
      message: 'Conversation must have exactly 2 participants',
    },
  })
  participants: Types.ObjectId[];

  /**
   * Reference to the last message in this conversation
   * Used for displaying conversation preview in chat list
   */
  @Prop({
    type: Types.ObjectId,
    ref: 'DirectMessage',
    default: null,
  })
  lastMessage?: Types.ObjectId;

  /**
   * Unread message count per user
   * Map: { userId: unreadCount }
   * Example: { "user1_id": 5, "user2_id": 0 }
   */
  @Prop({
    type: Map,
    of: Number,
    default: {},
  })
  unreadCount: Map<string, number>;

  /**
   * Track which users have muted this conversation
   * Map: { userId: isMuted }
   */
  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  mutedBy?: Map<string, boolean>;

  /**
   * Soft delete per user - users can delete conversation on their end
   * Map: { userId: isDeleted }
   */
  @Prop({
    type: Map,
    of: Boolean,
    default: {},
  })
  deletedBy?: Map<string, boolean>;

  /**
   * Track when each user last read messages
   * Used for "last seen" functionality
   */
  @Prop({
    type: Map,
    of: Date,
    default: {},
  })
  lastReadAt?: Map<string, Date>;

  // Timestamps added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

// CRITICAL: AutoIndex is disabled. No indexes are automatically created.
// Application layer handles duplicate prevention via sorting + findOne query.
// This prevents the broken unique_participants index that was causing E11000 errors.

