import { Controller, Post, Get, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { FriendService } from './friend.service';
import { SendFriendRequestDto, RespondToRequestDto, RemoveFriendDto } from './dto/friend.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('friend')
export class FriendController {
    constructor(private readonly friendService: FriendService) { }

    // Send a friend request
    @Post('request')
    sendFriendRequest(
        @CurrentUser() user: { userId: string },
        @Body() dto: SendFriendRequestDto,
    ) {
        return this.friendService.sendFriendRequest(user.userId, dto.toEmail);
    }

    // Get pending friend requests (received)
    @Get('requests/pending')
    getPendingRequests(@CurrentUser() user: { userId: string }) {
        return this.friendService.getPendingRequests(user.userId);
    }

    // Get sent friend requests
    @Get('requests/sent')
    getSentRequests(@CurrentUser() user: { userId: string }) {
        return this.friendService.getSentRequests(user.userId);
    }

    // Accept or reject a friend request
    @Post('request/respond')
    respondToRequest(
        @CurrentUser() user: { userId: string },
        @Body() dto: RespondToRequestDto,
    ) {
        return this.friendService.respondToRequest(user.userId, dto.requestId, dto.action);
    }

    // Get all friends
    @Get('list')
    getFriends(@CurrentUser() user: { userId: string }) {
        return this.friendService.getFriends(user.userId);
    }

    // Get friends count
    @Get('count')
    getFriendsCount(@CurrentUser() user: { userId: string }) {
        return this.friendService.getFriendsCount(user.userId);
    }

    // Get online friends count
    @Get('online-count')
    getOnlineFriendsCount(@CurrentUser() user: { userId: string }) {
        return this.friendService.getOnlineFriendsCount(user.userId);
    }

    // Remove a friend
    @Delete('remove')
    removeFriend(
        @CurrentUser() user: { userId: string },
        @Body() dto: RemoveFriendDto,
    ) {
        return this.friendService.removeFriend(user.userId, dto.friendEmail);
    }

    // Cancel a sent friend request
    @Delete('request/:requestId')
    cancelRequest(
        @CurrentUser() user: { userId: string },
        @Param('requestId') requestId: string,
    ) {
        return this.friendService.cancelRequest(user.userId, requestId);
    }
}
