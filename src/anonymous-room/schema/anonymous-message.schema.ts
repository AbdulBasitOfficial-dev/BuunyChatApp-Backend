import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AnonymousMessageDocument = AnonymousMessage & Document;

@Schema({ timestamps: true })
export class AnonymousMessage {
    @Prop({ required: true })
    roomId: string;

    @Prop({ required: true })
    anonymousName: string;

    @Prop({ required: true })
    content: string;

    @Prop({ required: true })
    createdAt: Date;

    @Prop({ required: true })
    socketId: string; // To identify the sender within the room session
}

export const AnonymousMessageSchema = SchemaFactory.createForClass(AnonymousMessage);

// Index for efficient queries
AnonymousMessageSchema.index({ roomId: 1, createdAt: -1 });
