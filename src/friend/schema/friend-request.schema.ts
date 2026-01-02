import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type FriendRequestDocument = HydratedDocument<FriendRequest>;

@Schema({ timestamps: true })
export class FriendRequest {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    from: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    to: Types.ObjectId;

    @Prop({
        type: String,
        enum: ['pending', 'accepted', 'rejected'],
        default: 'pending'
    })
    status: 'pending' | 'accepted' | 'rejected';
}

export const FriendRequestSchema = SchemaFactory.createForClass(FriendRequest);

// Compound index to prevent duplicate requests
FriendRequestSchema.index({ from: 1, to: 1 }, { unique: true });
