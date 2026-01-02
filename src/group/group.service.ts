import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from './schema/group.schema';
import { GroupMessage, GroupMessageDocument } from './schema/group-message.schema';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class GroupService {
    constructor(
        @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
        @InjectModel(GroupMessage.name) private groupMessageModel: Model<GroupMessageDocument>,
        @Inject(forwardRef(() => EventsGateway))
        private eventsGateway: EventsGateway,
    ) { }

    // Create a new group
    async createGroup(userId: string, name: string, description?: string, memberIds?: string[]) {
        const members = [new Types.ObjectId(userId)];

        // Add additional members if provided
        if (memberIds && memberIds.length > 0) {
            memberIds.forEach(id => {
                if (id !== userId) {
                    members.push(new Types.ObjectId(id));
                }
            });
        }

        const group = new this.groupModel({
            name,
            description: description || '',
            admin: new Types.ObjectId(userId),
            members,
        });

        const savedGroup = await group.save();
        await savedGroup.populate('members', 'name email');
        await savedGroup.populate('admin', 'name email');

        // Notify all members about the new group
        members.forEach(memberId => {
            this.eventsGateway.server.to(`user:${memberId.toString()}`).emit('group-created', {
                group: {
                    id: savedGroup._id,
                    name: savedGroup.name,
                    description: savedGroup.description,
                },
            });
        });

        return {
            id: savedGroup._id,
            name: savedGroup.name,
            description: savedGroup.description,
            admin: savedGroup.admin,
            members: savedGroup.members,
            createdAt: (savedGroup as any).createdAt,
        };
    }

    // Get all groups for a user
    async getUserGroups(userId: string) {
        const groups = await this.groupModel.find({
            members: new Types.ObjectId(userId),
        })
            .populate('admin', 'name email')
            .populate('members', 'name email')
            .sort({ createdAt: -1 })
            .exec();

        return groups.map(group => ({
            id: group._id,
            name: group.name,
            description: group.description,
            admin: group.admin,
            members: group.members,
            memberCount: group.members.length,
            createdAt: (group as any).createdAt,
        }));
    }

    // Get a single group by ID
    async getGroup(userId: string, groupId: string) {
        const group = await this.groupModel.findById(groupId)
            .populate('admin', 'name email')
            .populate('members', 'name email')
            .exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Check if user is a member
        const isMember = group.members.some(m => (m as any)._id.toString() === userId);
        if (!isMember) {
            throw new ForbiddenException('You are not a member of this group');
        }

        return {
            id: group._id,
            name: group.name,
            description: group.description,
            admin: group.admin,
            members: group.members,
            createdAt: (group as any).createdAt,
        };
    }

    // Add a member to a group
    async addMember(userId: string, groupId: string, memberId: string) {
        const group = await this.groupModel.findById(groupId).exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Only admin can add members
        if (group.admin.toString() !== userId) {
            throw new ForbiddenException('Only the group admin can add members');
        }

        // Check if already a member
        if (group.members.some(m => m.toString() === memberId)) {
            throw new BadRequestException('User is already a member of this group');
        }

        group.members.push(new Types.ObjectId(memberId));
        await group.save();
        await group.populate('members', 'name email');

        // Notify the new member
        this.eventsGateway.server.to(`user:${memberId}`).emit('group-joined', {
            groupId: group._id,
            groupName: group.name,
        });

        // Notify existing members
        group.members.forEach(member => {
            this.eventsGateway.server.to(`user:${(member as any)._id.toString()}`).emit('group-member-added', {
                groupId: group._id,
                memberId,
            });
        });

        return { message: 'Member added successfully' };
    }

    // Remove a member from a group (admin only)
    async removeMember(userId: string, groupId: string, memberId: string) {
        const group = await this.groupModel.findById(groupId).exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Only admin can remove members
        if (group.admin.toString() !== userId) {
            throw new ForbiddenException('Only the group admin can remove members');
        }

        // Cannot remove admin
        if (memberId === group.admin.toString()) {
            throw new BadRequestException('Cannot remove the group admin');
        }

        group.members = group.members.filter(m => m.toString() !== memberId);
        await group.save();

        // Notify the removed member
        this.eventsGateway.server.to(`user:${memberId}`).emit('group-removed', {
            groupId: group._id,
            groupName: group.name,
        });

        return { message: 'Member removed successfully' };
    }

    // Leave a group
    async leaveGroup(userId: string, groupId: string) {
        const group = await this.groupModel.findById(groupId).exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Admin cannot leave, they must delete the group or transfer admin
        if (group.admin.toString() === userId) {
            throw new BadRequestException('Admin cannot leave the group. Transfer admin role first or delete the group.');
        }

        // Remove the user from members
        group.members = group.members.filter(m => m.toString() !== userId);
        await group.save();

        // Send a system message
        await this.sendSystemMessage(groupId, userId, 'left the group');

        return { message: 'You have left the group' };
    }

    // Delete a group (admin only)
    async deleteGroup(userId: string, groupId: string) {
        const group = await this.groupModel.findById(groupId).exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        if (group.admin.toString() !== userId) {
            throw new ForbiddenException('Only the group admin can delete the group');
        }

        // Notify all members
        group.members.forEach(member => {
            this.eventsGateway.server.to(`user:${member.toString()}`).emit('group-deleted', {
                groupId: group._id,
                groupName: group.name,
            });
        });

        // Delete all messages
        await this.groupMessageModel.deleteMany({ group: new Types.ObjectId(groupId) }).exec();

        // Delete the group
        await this.groupModel.deleteOne({ _id: new Types.ObjectId(groupId) }).exec();

        return { message: 'Group deleted successfully' };
    }

    // Send a message to a group
    async sendMessage(userId: string, groupId: string, content: string, clientId?: string) {
        const group = await this.groupModel.findById(groupId)
            .populate('members', 'name')
            .exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Check if user is a member
        const isMember = group.members.some(m => (m as any)._id.toString() === userId);
        if (!isMember) {
            throw new ForbiddenException('You are not a member of this group');
        }

        const message = new this.groupMessageModel({
            group: new Types.ObjectId(groupId),
            sender: new Types.ObjectId(userId),
            content,
        });

        const savedMessage = await message.save();
        await savedMessage.populate('sender', 'name email');

        const messagePayload = {
            id: savedMessage._id,
            clientId,
            groupId,
            senderId: userId,
            senderName: (savedMessage.sender as any).name,
            content,
            timestamp: (savedMessage as any).createdAt,
            isSystemMessage: false,
        };

        // Broadcast to all group members
        group.members.forEach(member => {
            this.eventsGateway.server.to(`user:${(member as any)._id.toString()}`).emit('group-message', messagePayload);
        });

        return savedMessage;
    }

    // Send a system message (e.g., "User left the group")
    private async sendSystemMessage(groupId: string, userId: string, action: string) {
        const group = await this.groupModel.findById(groupId)
            .populate('members', 'name')
            .exec();

        if (!group) return;

        const message = new this.groupMessageModel({
            group: new Types.ObjectId(groupId),
            sender: new Types.ObjectId(userId),
            content: action,
            isSystemMessage: true,
        });

        const savedMessage = await message.save();
        await savedMessage.populate('sender', 'name');

        const messagePayload = {
            id: savedMessage._id,
            groupId,
            senderId: userId,
            senderName: (savedMessage.sender as any).name,
            content: `${(savedMessage.sender as any).name} ${action}`,
            timestamp: (savedMessage as any).createdAt,
            isSystemMessage: true,
        };

        group.members.forEach(member => {
            this.eventsGateway.server.to(`user:${(member as any)._id.toString()}`).emit('group-message', messagePayload);
        });
    }

    // Get group messages
    async getMessages(userId: string, groupId: string, limit = 50, before?: string) {
        const group = await this.groupModel.findById(groupId).exec();

        if (!group) {
            throw new NotFoundException('Group not found');
        }

        // Check if user is a member
        const isMember = group.members.some(m => m.toString() === userId);
        if (!isMember) {
            throw new ForbiddenException('You are not a member of this group');
        }

        let query: any = { group: new Types.ObjectId(groupId) };

        if (before) {
            query._id = { $lt: new Types.ObjectId(before) };
        }

        const messages = await this.groupMessageModel.find(query)
            .populate('sender', 'name email')
            .sort({ createdAt: 1 })
            .limit(limit)
            .exec();

        return messages.map(msg => ({
            id: msg._id,
            groupId: msg.group,
            sender: msg.sender,
            content: msg.content,
            isSystemMessage: msg.isSystemMessage,
            createdAt: (msg as any).createdAt,
        }));
    }
}
