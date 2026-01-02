import { Controller, Get, Param, Patch, Post, Body } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SendMessageDto } from './dto/chat.dto';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) { }

    @Get('history/:friendId')
    async getHistory(
        @CurrentUser() user: { userId: string },
        @Param('friendId') friendId: string
    ) {
        return this.chatService.getChatHistory(user.userId, friendId);
    }

    @Get('recent')
    async getRecent(@CurrentUser() user: { userId: string }) {
        return this.chatService.getRecentChats(user.userId);
    }

    @Patch('read/:friendId')
    async markRead(
        @CurrentUser() user: { userId: string },
        @Param('friendId') friendId: string
    ) {
        return this.chatService.markAsRead(user.userId, friendId);
    }

    @Post('send')
    async sendMessage(
        @CurrentUser() user: { userId: string },
        @Body() dto: SendMessageDto
    ) {
        return this.chatService.saveMessage(user.userId, dto.recipientId, dto.content, dto.clientId);
    }
}
