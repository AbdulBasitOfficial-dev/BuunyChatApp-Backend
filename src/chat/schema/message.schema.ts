import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    sender: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    recipient: Types.ObjectId;

    @Prop({ required: true })
    content: string;

    @Prop({ default: false })
    isRead: boolean;
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Add index for faster queries between two users
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ recipient: 1, sender: 1 });
