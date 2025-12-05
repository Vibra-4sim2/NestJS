import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument, Types } from "mongoose";
//for the js version :
// import mongoose from "mongoose";

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
    @Prop({ type: String, required: true })
    firstName: string;
  
    @Prop({ type: String, required: true })
    lastName: string;

    @Prop({ type: String, required: true })
    Gender: string;
    
    @Prop({ type: String, required: true, unique: true })
    email: string;
   
    @Prop({ type: String, required: false, default: '' })
    avatar?: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, required: true, enum: ['ADMIN', 'USER'], default: 'USER' })
    role: 'ADMIN' | 'USER';
    @Prop({ type: String, required: false })
    resetCode?: string;

    @Prop({ type: Date, required: false })
    resetCodeExpires?: Date;

     @Prop({ type: Date, required: false })
    birthday?: Date;

    // Followers system
    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    followers: Types.ObjectId[];

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    following: Types.ObjectId[];

    @Prop({ type: Number, default: 0 })
    followersCount: number;

    @Prop({ type: Number, default: 0 })
    followingCount: number;

    @Prop({
        type: {
            average: { type: Number, default: 0 },
            count: { type: Number, default: 0 },
        },
        default: { average: 0, count: 0 },
    })
    creatorRatingSummary: {
        average: number;
        count: number;
    };
}

//TS version
export const userSchema = SchemaFactory.createForClass(User)

// Add indexes for better performance
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

//JS version
// export const userSchema = new mongoose.Schema(
//     {
//         firstName: { type: String, required: true },
//         lastName: { type: String, required: true },
//         studentId: { type: String, required: true },
//         email: { type: String, required: true, unique: true },
//         age: { type: Number, required: true },
//         avatar: { type: String, required: true }
//     }
// )

