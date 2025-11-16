import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CampingDocument = Camping & Document;

@Schema({ timestamps: true })
export class Camping {
  @Prop({ required: true })
  nom: string;

  @Prop({ required: false })
  description?: string;

  @Prop({ required: true })
  lieu: string;

  @Prop({ required: false })
  prix?: number;


   @Prop({ required: false })
  participants?: number;
  
  @Prop({ required: true })
  dateDebut: Date;

  @Prop({ required: true })
  dateFin: Date;

  @Prop({
    type: [Types.ObjectId],
    ref: 'Sortie',
    default: [],
  })
  sorties?: Types.ObjectId[];
}

export const CampingSchema = SchemaFactory.createForClass(Camping);
