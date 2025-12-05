import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RatingDocument = Rating & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Rating {
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
    min: 1,
    max: 5,
    type: Number,
  })
  stars: number;

  @Prop({
    required: false,
    type: String,
  })
  comment?: string;
}

export const RatingSchema = SchemaFactory.createForClass(Rating);

// Create compound unique index on userId + sortieId to ensure one rating per user per sortie
RatingSchema.index({ userId: 1, sortieId: 1 }, { unique: true });

// Index for efficient queries by sortie
RatingSchema.index({ sortieId: 1 });

// Index for efficient queries by user
RatingSchema.index({ userId: 1 });
