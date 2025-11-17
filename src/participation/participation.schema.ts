import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ParticipationStatus } from '../enums/participation-status.enum';

export type ParticipationDocument = Participation & Document;

@Schema({ timestamps: true })
export class Participation {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'Sortie',
    required: true,
  })
  sortieId: Types.ObjectId;

  @Prop({
    required: true,
    enum: ParticipationStatus,
    default: ParticipationStatus.EN_ATTENTE,
  })
  status: ParticipationStatus;
}

export const ParticipationSchema = SchemaFactory.createForClass(Participation);

// Create compound unique index on userId + sortieId
ParticipationSchema.index({ userId: 1, sortieId: 1 }, { unique: true });
