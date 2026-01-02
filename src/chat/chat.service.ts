import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schema/message.schema';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class ChatService {
    constructor(
        @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
        @Inject(forwardRef(() => EventsGateway))
        private eventsGateway: EventsGateway,
    ) { }

    async saveMessage(senderId: string, recipientId: string, content: string, clientId?: string): Promise<MessageDocument> {
        const newMessage = new this.messageModel({
            sender: new Types.ObjectId(senderId),
            recipient: new Types.ObjectId(recipientId),
            content,
        });
        const savedMessage = await newMessage.save();
        await savedMessage.populate('sender', 'name');

        const senderName = (savedMessage.sender as any).name;

        // Broadcast the message via Sockets
        this.eventsGateway.server.to(`user:${recipientId}`).emit('receive-message', {
            id: savedMessage._id,
            clientId: clientId,
            senderId: senderId,
            senderName: senderName,
            recipientId: recipientId,
            content: content,
            timestamp: (savedMessage as any).createdAt,
        });

        // Also broadcast to other devices of the sender
        this.eventsGateway.server.to(`user:${senderId}`).emit('receive-message', {
            id: savedMessage._id,
            clientId: clientId,
            senderId: senderId,
            senderName: senderName,
            recipientId: recipientId,
            content: content,
            timestamp: (savedMessage as any).createdAt,
        });

        return savedMessage;
    }

    async getChatHistory(userId: string, friendId: string): Promise<MessageDocument[]> {
        return this.messageModel.find({
            $or: [
                { sender: new Types.ObjectId(userId), recipient: new Types.ObjectId(friendId) },
                { sender: new Types.ObjectId(friendId), recipient: new Types.ObjectId(userId) },
            ],
        })
            .sort({ createdAt: 1 }) // Chronological order
            .exec();
    }

    async getRecentChats(userId: string) {
        // This is a bit more complex, find all unique users the current user has chatted with
        const messages = await this.messageModel.find({
            $or: [{ sender: new Types.ObjectId(userId) }, { recipient: new Types.ObjectId(userId) }],
        })
            .sort({ createdAt: -1 })
            .populate('sender', 'name email isOnline')
            .populate('recipient', 'name email isOnline')
            .exec();

        const chats = new Map();
        messages.forEach((msg) => {
            const otherUser = msg.sender._id.toString() === userId ? msg.recipient : msg.sender;
            const otherUserId = (otherUser as any)._id.toString();
            if (!chats.has(otherUserId)) {
                chats.set(otherUserId, {
                    user: otherUser,
                    lastMessage: msg.content,
                    timestamp: (msg as any).createdAt,
                });
            }
        });

        return Array.from(chats.values());
    }

    async markAsRead(userId: string, friendId: string) {
        return this.messageModel.updateMany(
            { sender: new Types.ObjectId(friendId), recipient: new Types.ObjectId(userId), isRead: false },
            { $set: { isRead: true } }
        ).exec();
    }
}
