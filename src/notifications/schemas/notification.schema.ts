import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  // Legacy: batch notification queue (for cron/retry)
  @Prop({ type: [Types.ObjectId], ref: 'User', index: true })
  userIds?: Types.ObjectId[];

  // NEW: single recipient for polling/persistence (HYBRID MODE)
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  body: string;

  // NEW: notification type (opaque to backend, interpreted by client)
  @Prop({ type: String, index: true })
  type?: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ type: String })
  imageUrl?: string;

  // Legacy: queue status (for cron)
  @Prop({ 
    type: String, 
    enum: ['queued', 'sent', 'failed'], 
    default: 'queued',
    index: true
  })
  status?: string;

  @Prop({ type: Number, default: 0 })
  attempts?: number;

  @Prop({ type: Date, default: Date.now, index: true })
  scheduledAt?: Date;

  @Prop({ type: String })
  lastError?: string;

  // NEW: read tracking (HYBRID MODE)
  @Prop({ type: Boolean, default: false, index: true })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Legacy index: cron queue processing
NotificationSchema.index({ status: 1, scheduledAt: 1, attempts: 1 });

// NEW: efficient polling queries (HYBRID MODE)
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
