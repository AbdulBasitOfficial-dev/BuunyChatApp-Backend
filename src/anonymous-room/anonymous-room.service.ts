import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AnonymousRoom, AnonymousRoomDocument } from './schema/anonymous-room.schema';
import { AnonymousMessage, AnonymousMessageDocument } from './schema/anonymous-message.schema';
import { Cron, CronExpression } from '@nestjs/schedule';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnonymousRoomService {
    private anonymousNames = [
        'AnonymousTiger', 'AnonymousLion', 'AnonymousEagle', 'AnonymousPanda',
        'AnonymousWolf', 'AnonymousFox', 'AnonymousBear', 'AnonymousDragon',
        'AnonymousPhoenix', 'AnonymousShark', 'AnonymousDolphin', 'AnonymousOwl',
        'AnonymousHawk', 'AnonymousLeopard', 'AnonymousPanther', 'AnonymousJaguar',
        'AnonymousCheetah', 'AnonymousLynx', 'AnonymousRaven', 'AnonymousFalcon'
    ];

    constructor(
        @InjectModel(AnonymousRoom.name) private anonymousRoomModel: Model<AnonymousRoomDocument>,
        @InjectModel(AnonymousMessage.name) private anonymousMessageModel: Model<AnonymousMessageDocument>,
    ) {}

    generateAnonymousName(): string {
        const randomName = this.anonymousNames[Math.floor(Math.random() * this.anonymousNames.length)];
        const randomNumber = Math.floor(Math.random() * 1000);
        return `${randomName}${randomNumber}`;
    }

    async createRoom(roomName: string, tags: string[]): Promise<AnonymousRoomDocument> {
        const roomId = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

        const room = new this.anonymousRoomModel({
            roomId,
            roomName,
            tags,
            createdAt: now,
            expiresAt,
            activeUsersCount: 0,
            connectedUsers: new Map(),
        });

        return await room.save();
    }

    async getAllActiveRooms(): Promise<AnonymousRoomDocument[]> {
        const now = new Date();
        return await this.anonymousRoomModel
            .find({ expiresAt: { $gt: now } })
            .sort({ createdAt: -1 })
            .exec();
    }

    async getRoomById(roomId: string): Promise<AnonymousRoomDocument> {
        const room = await this.anonymousRoomModel.findOne({ roomId }).exec();
        if (!room) {
            throw new NotFoundException('Room not found');
        }

        // Check if room has expired
        if (new Date() >= room.expiresAt) {
            throw new BadRequestException('Room has expired');
        }

        return room;
    }

    async addUserToRoom(roomId: string, socketId: string): Promise<{ room: AnonymousRoomDocument, anonymousName: string }> {
        const room = await this.getRoomById(roomId);

        // Check if user is already in room
        const existingName = room.connectedUsers.get(socketId);
        if (existingName) {
            return { room, anonymousName: existingName };
        }

        // Generate unique anonymous name
        const anonymousName = this.generateAnonymousName();
        room.connectedUsers.set(socketId, anonymousName);
        room.activeUsersCount = room.connectedUsers.size;

        await room.save();
        return { room, anonymousName };
    }

    async removeUserFromRoom(roomId: string, socketId: string): Promise<AnonymousRoomDocument | null> {
        const room = await this.anonymousRoomModel.findOne({ roomId }).exec();
        if (!room) return null;

        room.connectedUsers.delete(socketId);
        room.activeUsersCount = room.connectedUsers.size;

        await room.save();
        return room;
    }

    async saveMessage(roomId: string, socketId: string, content: string): Promise<AnonymousMessageDocument> {
        const room = await this.getRoomById(roomId);
        
        // Get anonymous name for this socket
        const anonymousName = room.connectedUsers.get(socketId);
        if (!anonymousName) {
            throw new BadRequestException('User not in room');
        }

        const message = new this.anonymousMessageModel({
            roomId,
            anonymousName,
            content,
            socketId,
            createdAt: new Date(),
        });

        return await message.save();
    }

    async getRoomMessages(roomId: string, limit: number = 50): Promise<AnonymousMessageDocument[]> {
        await this.getRoomById(roomId); // Validate room exists and not expired

        return await this.anonymousMessageModel
            .find({ roomId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .exec()
            .then(messages => messages.reverse());
    }

    // Cleanup task: Delete messages for expired rooms every hour
    @Cron(CronExpression.EVERY_HOUR)
    async cleanupExpiredRoomMessages() {
        const now = new Date();
        
        // Find all expired rooms
        const expiredRooms = await this.anonymousRoomModel
            .find({ expiresAt: { $lt: now } })
            .exec();

        // Delete messages for each expired room
        for (const room of expiredRooms) {
            await this.anonymousMessageModel.deleteMany({ roomId: room.roomId }).exec();
        }

        console.log(`✅ Cleaned up messages for ${expiredRooms.length} expired rooms`);
    }

    async updateRoomActiveCount(roomId: string): Promise<number> {
        const room = await this.anonymousRoomModel.findOne({ roomId }).exec();
        if (!room) return 0;
        
        return room.activeUsersCount;
    }
}
