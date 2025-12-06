import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FcmTokenDocument = HydratedDocument<FcmToken>;

@Schema({ timestamps: true })
export class FcmToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, required: false })
  deviceId?: string;

  @Prop({ type: String, enum: ['android', 'ios', 'web'], required: false })
  platform?: 'android' | 'ios' | 'web';

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date, default: Date.now })
  lastUsedAt: Date;
}

export const FcmTokenSchema = SchemaFactory.createForClass(FcmToken);

// Index pour recherche rapide par utilisateur
FcmTokenSchema.index({ userId: 1 });
// Index unique pour éviter les doublons de tokens
FcmTokenSchema.index({ userId: 1, token: 1 }, { unique: true });
