import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type FcmTokenDocument = FcmToken & Document;

@Schema({ timestamps: true })
export class FcmToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ type: String, required: false })
  deviceId?: string;

  @Prop({ 
    type: String, 
    enum: ['ios', 'android', 'web', 'unknown'], 
    default: 'unknown' 
  })
  platform: string;

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastUsedAt: Date;

  @Prop({ type: String, required: false })
  lastError?: string;
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);

// Index for fast user queries
FcmTokenSchema.index({ userId: 1, isActive: 1 });
// Unique index to prevent duplicate tokens
FcmTokenSchema.index({ token: 1 }, { unique: true });
