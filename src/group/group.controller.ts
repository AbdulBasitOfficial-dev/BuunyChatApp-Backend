import { Controller, Post, Get, Delete, Body, Param, Query } from '@nestjs/common';
import { GroupService } from './group.service';
import { CreateGroupDto, AddMemberDto, RemoveMemberDto, LeaveGroupDto, SendGroupMessageDto, UpdateGroupDto } from './dto/group.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('group')
export class GroupController {
    constructor(private readonly groupService: GroupService) { }

    // Create a new group
    @Post('create')
    createGroup(
        @CurrentUser() user: { userId: string },
        @Body() dto: CreateGroupDto,
    ) {
        return this.groupService.createGroup(user.userId, dto.name, dto.description, dto.memberIds);
    }

    // Get all groups for the current user
    @Get('list')
    getUserGroups(@CurrentUser() user: { userId: string }) {
        return this.groupService.getUserGroups(user.userId);
    }

    // Get a single group
    @Get(':groupId')
    getGroup(
        @CurrentUser() user: { userId: string },
        @Param('groupId') groupId: string,
    ) {
        return this.groupService.getGroup(user.userId, groupId);
    }

    // Add a member to a group
    @Post('add-member')
    addMember(
        @CurrentUser() user: { userId: string },
        @Body() dto: AddMemberDto,
    ) {
        return this.groupService.addMember(user.userId, dto.groupId, dto.memberId);
    }

    // Remove a member from a group
    @Post('remove-member')
    removeMember(
        @CurrentUser() user: { userId: string },
        @Body() dto: RemoveMemberDto,
    ) {
        return this.groupService.removeMember(user.userId, dto.groupId, dto.memberId);
    }

    // Leave a group
    @Post('leave')
    leaveGroup(
        @CurrentUser() user: { userId: string },
        @Body() dto: LeaveGroupDto,
    ) {
        return this.groupService.leaveGroup(user.userId, dto.groupId);
    }

    // Delete a group
    @Delete(':groupId')
    deleteGroup(
        @CurrentUser() user: { userId: string },
        @Param('groupId') groupId: string,
    ) {
        return this.groupService.deleteGroup(user.userId, groupId);
    }

    // Send a message to a group
    @Post('message')
    sendMessage(
        @CurrentUser() user: { userId: string },
        @Body() dto: SendGroupMessageDto,
    ) {
        return this.groupService.sendMessage(user.userId, dto.groupId, dto.content, dto.clientId);
    }

    // Get group messages
    @Get(':groupId/messages')
    getMessages(
        @CurrentUser() user: { userId: string },
        @Param('groupId') groupId: string,
        @Query('limit') limit?: string,
        @Query('before') before?: string,
    ) {
        return this.groupService.getMessages(user.userId, groupId, limit ? parseInt(limit) : 50, before);
    }
}
