import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";

export type PublicationDocument = HydratedDocument<Publication>

@Schema({ timestamps: true })
export class Publication {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    author: Types.ObjectId;

    @Prop({ type: String, required: true })
    content: string;

    @Prop({ type: String, required: false, default: '' })
    image?: string;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    mentions: Types.ObjectId[];

    @Prop({ type: String, required: false })
    location?: string;

    @Prop({ type: Number, default: 0 })
    likesCount: number;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    likedBy: Types.ObjectId[];

    @Prop({ type: Number, default: 0 })
    commentsCount: number;

    @Prop({ type: Number, default: 0 })
    sharesCount: number;

    @Prop({ type: Boolean, default: true })
    isActive: boolean;
}

export const publicationSchema = SchemaFactory.createForClass(Publication)