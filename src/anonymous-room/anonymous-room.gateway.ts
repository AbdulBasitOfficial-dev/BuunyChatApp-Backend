import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    ConnectedSocket,
    MessageBody,
    OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { AnonymousRoomService } from './anonymous-room.service';

interface AnonymousSocket extends Socket {
    anonymousRoomId?: string;
    anonymousName?: string;
}

@WebSocketGateway({
    cors: {
        origin: '*',
        credentials: true,
    },
    transports: ['websocket', 'polling'],
})
export class AnonymousRoomGateway implements OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('AnonymousRoomGateway');

    constructor(private anonymousRoomService: AnonymousRoomService) {}

    @SubscribeMessage('create-anonymous-room')
    async handleCreateRoom(
        @ConnectedSocket() client: AnonymousSocket,
        @MessageBody() data: { roomName: string; tags: string[] },
    ) {
        try {
            const room = await this.anonymousRoomService.createRoom(data.roomName, data.tags);

            // Auto-join creator to the room
            const { anonymousName } = await this.anonymousRoomService.addUserToRoom(room.roomId, client.id);
            
            client.anonymousRoomId = room.roomId;
            client.anonymousName = anonymousName;
            client.join(`anon-room:${room.roomId}`);

            this.logger.log(`✅ Room created: ${room.roomName} (${room.roomId})`);

            // Broadcast new room to all clients
            this.server.emit('new-anonymous-room', {
                roomId: room.roomId,
                roomName: room.roomName,
                tags: room.tags,
                activeUsersCount: 1,
                expiresAt: room.expiresAt,
                createdAt: room.createdAt,
            });

            return {
                event: 'room-created',
                data: {
                    roomId: room.roomId,
                    roomName: room.roomName,
                    anonymousName,
                    tags: room.tags,
                    expiresAt: room.expiresAt,
                },
            };
        } catch (error) {
            this.logger.error(`❌ Error creating room: ${error.message}`);
            client.emit('error', { message: 'Failed to create room' });
        }
    }

    @SubscribeMessage('join-anonymous-room')
    async handleJoinRoom(
        @ConnectedSocket() client: AnonymousSocket,
        @MessageBody() data: { roomId: string },
    ) {
        try {
            const { room, anonymousName } = await this.anonymousRoomService.addUserToRoom(data.roomId, client.id);

            client.anonymousRoomId = room.roomId;
            client.anonymousName = anonymousName;
            client.join(`anon-room:${room.roomId}`);

            this.logger.log(`👤 ${anonymousName} joined room: ${room.roomName}`);

            // Notify all in room about new user
            this.server.to(`anon-room:${room.roomId}`).emit('user-joined-anonymous-room', {
                roomId: room.roomId,
                anonymousName,
                activeUsersCount: room.activeUsersCount,
            });

            // Broadcast updated count to all clients (for room cards)
            this.server.emit('anonymous-room-updated', {
                roomId: room.roomId,
                activeUsersCount: room.activeUsersCount,
            });

            // Get room messages
            const messages = await this.anonymousRoomService.getRoomMessages(room.roomId);

            return {
                event: 'joined-anonymous-room',
                data: {
                    roomId: room.roomId,
                    roomName: room.roomName,
                    anonymousName,
                    activeUsersCount: room.activeUsersCount,
                    expiresAt: room.expiresAt,
                    messages: messages.map(msg => ({
                        id: msg._id,
                        anonymousName: msg.anonymousName,
                        content: msg.content,
                        createdAt: msg.createdAt,
                        isMe: msg.socketId === client.id,
                    })),
                },
            };
        } catch (error) {
            this.logger.error(`❌ Error joining room: ${error.message}`);
            client.emit('error', { message: error.message || 'Failed to join room' });
        }
    }

    @SubscribeMessage('leave-anonymous-room')
    async handleLeaveRoom(@ConnectedSocket() client: AnonymousSocket) {
        await this.leaveRoom(client);
    }

    @SubscribeMessage('send-anonymous-message')
    async handleSendMessage(
        @ConnectedSocket() client: AnonymousSocket,
        @MessageBody() data: { roomId: string; content: string; clientId?: string },
    ) {
        try {
            if (!client.anonymousRoomId || client.anonymousRoomId !== data.roomId) {
                client.emit('error', { message: 'You are not in this room' });
                return;
            }

            const message = await this.anonymousRoomService.saveMessage(
                data.roomId,
                client.id,
                data.content,
            );

            this.logger.log(`💬 Message in ${data.roomId} from ${message.anonymousName}`);

            // Broadcast to all in room
            this.server.to(`anon-room:${data.roomId}`).emit('receive-anonymous-message', {
                id: message._id,
                clientId: data.clientId,
                roomId: data.roomId,
                anonymousName: message.anonymousName,
                content: message.content,
                createdAt: message.createdAt,
                isMe: false, // Each client will determine this
            });

            return {
                event: 'anonymous-message-sent',
                data: {
                    id: message._id,
                    clientId: data.clientId,
                },
            };
        } catch (error) {
            this.logger.error(`❌ Error sending message: ${error.message}`);
            client.emit('error', { message: 'Failed to send message' });
        }
    }

    async handleDisconnect(client: AnonymousSocket) {
        await this.leaveRoom(client);
    }

    private async leaveRoom(client: AnonymousSocket) {
        if (client.anonymousRoomId) {
            const roomId = client.anonymousRoomId;
            const anonymousName = client.anonymousName;

            const room = await this.anonymousRoomService.removeUserFromRoom(roomId, client.id);

            if (room) {
                this.logger.log(`👋 ${anonymousName} left room: ${roomId}`);

                // Notify room about user leaving
                this.server.to(`anon-room:${roomId}`).emit('user-left-anonymous-room', {
                    roomId,
                    anonymousName,
                    activeUsersCount: room.activeUsersCount,
                });

                // Broadcast updated count to all clients
                this.server.emit('anonymous-room-updated', {
                    roomId,
                    activeUsersCount: room.activeUsersCount,
                });
            }

            client.leave(`anon-room:${roomId}`);
            client.anonymousRoomId = undefined;
            client.anonymousName = undefined;
        }
    }
}
