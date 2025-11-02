import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { HydratedDocument } from "mongoose";
//for the js version :
// import mongoose from "mongoose";

export type UserDocument = HydratedDocument<User>

@Schema({ timestamps: true })
export class User {
    @Prop({ type: String, required: true })
    firstName: string;
  
  
    @Prop({ type: String, required: true, unique: true })
    email: string;
   
    @Prop({ type: String, required: false, default: '' })
    avatar?: string;

    @Prop({ type: String, required: true })
    password: string;

    @Prop({ type: String, required: true, enum: ['ADMIN', 'USER'], default: 'USER' })
    role: 'ADMIN' | 'USER';
}

//TS version
export const userSchema = SchemaFactory.createForClass(User)

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

