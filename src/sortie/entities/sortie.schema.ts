import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SortieType } from '../../enums/sortie-type.enum';

export type SortieDocument = Sortie & Document;

@Schema({ timestamps: true })
export class Sortie {
  @Prop({ required: true })
  titre: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: false })
  difficulte?: string;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true, enum: SortieType })
  type: SortieType;

  @Prop({ required: true, default: false })
  option_camping: boolean;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createurId: Types.ObjectId;

 @Prop({ required: false })
  photo?: string;
 
  @Prop({
    type: Types.ObjectId,
    ref: 'Camping',
    default: null,
  })
  camping?: Types.ObjectId | null;

  @Prop({ required: false })
  capacite?: number;

  @Prop({
    required: false,
    type: {
      pointDepart: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        display_name: { type: String, required: false },
        address: { type: String, required: false },
      },
      pointArrivee: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
        display_name: { type: String, required: false },
        address: { type: String, required: false },
      },
      description: { type: String, required: false },
      distance: { type: Number, required: false },
      duree_estimee: { type: Number, required: false },
      geometry: { type: [[Number]], required: false },
      instructions: { type: [String], required: false },
    },
  })
  itineraire?: {
    pointDepart: {
      latitude: number;
      longitude: number;
      display_name?: string;
      address?: string;
    };
    pointArrivee: {
      latitude: number;
      longitude: number;
      display_name?: string;
      address?: string;
    };
    description?: string;
    distance?: number;
    duree_estimee?: number;
    geometry?: number[][];
    instructions?: string[];
  };

  @Prop({
    type: [Types.ObjectId],
    ref: 'Participation',
    default: [],
  })
  participants: Types.ObjectId[];
}

export const SortieSchema = SchemaFactory.createForClass(Sortie);
