
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type PreferencesDocument = HydratedDocument<Preferences>;

@Schema({ timestamps: true })
export class Preferences {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId;

  @Prop({ type: String, enum: ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], required: false })
  level?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';

  @Prop({ type: Number, required: false, min: 0, max: 100 })
  weeklyRideHours?: number;

  @Prop({ type: Boolean, default: false })
  onboardingComplete: boolean;
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);
PreferencesSchema.index({ user: 1 }, { unique: true });