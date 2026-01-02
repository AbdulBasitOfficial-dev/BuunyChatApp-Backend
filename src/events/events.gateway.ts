import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, forwardRef } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ChatService } from '../chat/chat.service';
import { MessageBody } from '@nestjs/websockets';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('EventsGateway');

  // Map to track connected users: { userId: Set<socketId> }
  private connectedUsers: Map<string, Set<string>> = new Map();

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(forwardRef(() => ChatService))
    private chatService: ChatService,
  ) {}

  afterInit() {
    this.logger.log(' WebSocket Gateway Initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Get token from handshake
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(
          `Client ${client.id} connection rejected: No token provided`,
        );
        client.emit('error', { message: 'No authentication token' });
        client.disconnect();
        return;
      }

      // Verify JWT token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // JWT uses 'sub' for user id
      const userId = payload.sub;

      client.userId = userId;
      client.userEmail = payload.email;

      // Store connected user
      if (!this.connectedUsers.has(userId)) {
        this.connectedUsers.set(userId, new Set());
      }
      this.connectedUsers.get(userId)?.add(client.id);

      // Join user's personal room
      client.join(`user:${userId}`);

      this.logger.log(
        `✅ Client connected: ${client.id} (User: ${payload.email}, ID: ${userId})`,
      );

      // Notify client of successful connection
      client.emit('connected', {
        message: 'Connected to BunnyChat!',
        userId: userId,
      });
    } catch (error) {
      this.logger.error(
        `❌ Client ${client.id} connection error: ${error.message}`,
      );
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      const userSockets = this.connectedUsers.get(client.userId);
      if (userSockets) {
        userSockets.delete(client.id);
        if (userSockets.size === 0) {
          this.connectedUsers.delete(client.userId);
        }
      }
      this.logger.log(
        `🔌 Client disconnected: ${client.id} (User: ${client.userEmail})`,
      );
    }
  }

  // Send friend request notification to specific user
  sendFriendRequestNotification(
    toUserId: string,
    fromUser: { id: string; name: string; email: string },
  ) {
    this.logger.log(
      `📤 Sending friend request notification to user: ${toUserId}`,
    );

    this.server.to(`user:${toUserId}`).emit('friend-request-received', {
      from: fromUser,
      message: `${fromUser.name} sent you a friend request!`,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  // Send friend request accepted notification
  sendFriendRequestAccepted(
    toUserId: string,
    acceptedBy: { id: string; name: string; email: string },
  ) {
    this.logger.log(
      `📤 Sending friend accepted notification to user: ${toUserId}`,
    );

    this.server.to(`user:${toUserId}`).emit('friend-request-accepted', {
      acceptedBy,
      message: `${acceptedBy.name} accepted your friend request!`,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // Send friend request rejected notification
  sendFriendRequestRejected(
    toUserId: string,
    rejectedBy: { id: string; name: string },
  ) {
    this.server.to(`user:${toUserId}`).emit('friend-request-rejected', {
      rejectedBy,
      message: `${rejectedBy.name} rejected your friend request`,
      timestamp: new Date().toISOString(),
    });
    return true;
  }

  // Check if user is online
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  // Get online users count
  getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  // Get all connected user IDs
  getConnectedUserIds(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  // Send notification to all friends that user is online
  notifyFriendsUserOnline(userId: string, friendIds: string[]) {
    friendIds.forEach((friendId) => {
      this.server.to(`user:${friendId}`).emit('friend-online', { userId });
    });
  }

  // Send notification to all friends that user is offline
  notifyFriendsUserOffline(userId: string, friendIds: string[]) {
    friendIds.forEach((friendId) => {
      this.server.to(`user:${friendId}`).emit('friend-offline', { userId });
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: AuthenticatedSocket) {
    return { event: 'pong', data: { timestamp: Date.now() } };
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { recipientId: string; content: string; clientId?: string },
  ) {
    const senderId = client.userId;
    if (!senderId) return;

    try {
      // Save message (ChatService handles broadcasting)
      const savedMessage = await this.chatService.saveMessage(
        senderId,
        data.recipientId,
        data.content,
        data.clientId,
      );

      this.logger.log(`💬 Message sent from ${senderId} to ${data.recipientId}`);

      // Confirm to sender that message was handled
      const messagePayload = {
        id: savedMessage._id,
        clientId: data.clientId,
        senderId: senderId,
        recipientId: data.recipientId,
        content: data.content,
        timestamp: (savedMessage as any).createdAt,
      };

      return { event: 'message-sent', data: messagePayload };
    } catch (error) {
      this.logger.error(`❌ Error sending message: ${error.message}`);
      client.emit('error', { message: 'Failed to send message' });
    }
  }
}
