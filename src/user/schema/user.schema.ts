import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true, unique: true })
    email: string;

    @Prop({ required: true })
    password: string;

    @Prop({ default: false })
    isOnline: boolean;

    @Prop({ default: 'user' })
    role: 'user' | 'admin';

    @Prop({ default: '' })
    bio: string;

    @Prop({ default: '#6366f1' }) // Default indigo color
    profileColor: string;

    @Prop({ default: '' })
    avatar: string;

    @Prop({ default: 'Hey there! I am using BunnyChat.' })
    status: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
