import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AnonymousRoomDocument = AnonymousRoom & Document;

@Schema({ timestamps: true })
export class AnonymousRoom {
    @Prop({ required: true, unique: true })
    roomId: string;

    @Prop({ required: true })
    roomName: string;

    @Prop({ type: [String], default: [] })
    tags: string[];

    @Prop({ required: true })
    createdAt: Date;

    @Prop({ required: true })
    expiresAt: Date;

    @Prop({ default: 0 })
    activeUsersCount: number;

    @Prop({ type: Map, of: String, default: {} })
    connectedUsers: Map<string, string>; // Map of socketId -> anonymousName
}

export const AnonymousRoomSchema = SchemaFactory.createForClass(AnonymousRoom);

// Index for auto-deletion using TTL
AnonymousRoomSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
