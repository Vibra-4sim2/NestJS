import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PollDocument = Poll & Document & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Poll {
  @Prop({
    type: Types.ObjectId,
    ref: 'Chat',
    required: true,
    index: true,
  })
  chatId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  creatorId: Types.ObjectId;

  @Prop({
    required: true,
    type: String,
  })
  question: string;

  @Prop({
    type: [
      {
        _id: false,
        optionId: { type: String, required: true },
        text: { type: String, required: true },
        votes: { type: Number, default: 0 },
      },
    ],
    required: true,
  })
  options: Array<{
    optionId: string;
    text: string;
    votes: number;
  }>;

  @Prop({
    type: [
      {
        _id: false,
        userId: { type: Types.ObjectId, ref: 'User', required: true },
        optionId: { type: String, required: true },
        votedAt: { type: Date, default: Date.now },
      },
    ],
    default: [],
  })
  votes: Array<{
    userId: Types.ObjectId;
    optionId: string;
    votedAt: Date;
  }>;

  @Prop({
    type: Boolean,
    default: false,
  })
  allowMultiple: boolean;

  @Prop({
    type: Date,
    default: null,
  })
  closesAt: Date | null;

  @Prop({
    type: Boolean,
    default: false,
  })
  closed: boolean;
}

export const PollSchema = SchemaFactory.createForClass(Poll);

// Indexes for efficient queries
PollSchema.index({ chatId: 1, createdAt: -1 });
PollSchema.index({ chatId: 1, 'votes.userId': 1 });
