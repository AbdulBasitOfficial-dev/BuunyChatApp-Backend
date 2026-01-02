import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AnonymousRoomService } from './anonymous-room.service';
import { CreateAnonymousRoomDto } from './dto/anonymous-room.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('anonymous-rooms')
@UseGuards(JwtAuthGuard)
export class AnonymousRoomController {
    constructor(private anonymousRoomService: AnonymousRoomService) {}

    @Get()
    async getAllRooms() {
        const rooms = await this.anonymousRoomService.getAllActiveRooms();
        return rooms.map(room => ({
            roomId: room.roomId,
            roomName: room.roomName,
            tags: room.tags,
            activeUsersCount: room.activeUsersCount,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt,
        }));
    }

    @Get(':roomId')
    async getRoom(@Param('roomId') roomId: string) {
        const room = await this.anonymousRoomService.getRoomById(roomId);
        return {
            roomId: room.roomId,
            roomName: room.roomName,
            tags: room.tags,
            activeUsersCount: room.activeUsersCount,
            createdAt: room.createdAt,
            expiresAt: room.expiresAt,
        };
    }

    @Get(':roomId/messages')
    async getRoomMessages(@Param('roomId') roomId: string) {
        const messages = await this.anonymousRoomService.getRoomMessages(roomId);
        return messages.map(msg => ({
            id: msg._id,
            anonymousName: msg.anonymousName,
            content: msg.content,
            createdAt: msg.createdAt,
        }));
    }
}
