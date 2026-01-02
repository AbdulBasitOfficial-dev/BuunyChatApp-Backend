import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ timestamps: true })
export class Group {
    @Prop({ required: true, trim: true })
    name: string;

    @Prop({ type: String, default: '' })
    description: string;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    admin: Types.ObjectId;

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    members: Types.ObjectId[];

    @Prop({ type: String, default: null })
    avatar: string;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
