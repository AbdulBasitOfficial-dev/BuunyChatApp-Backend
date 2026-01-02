import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FriendRequest, FriendRequestDocument } from './schema/friend-request.schema';
import { User, UserDocument } from '../user/schema/user.schema';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class FriendService {
    private readonly logger = new Logger(FriendService.name);

    constructor(
        @InjectModel(FriendRequest.name) private friendRequestModel: Model<FriendRequestDocument>,
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private eventsGateway: EventsGateway,
    ) { }

    // Send a friend request
    async sendFriendRequest(fromUserId: string, toEmail: string) {
        this.logger.log(`Sending friend request from ${fromUserId} to ${toEmail}`);

        // Find the sender user
        const fromUser = await this.userModel.findById(fromUserId).exec();
        if (!fromUser) {
            throw new NotFoundException('Sender user not found');
        }

        // Find the recipient user
        const toUser = await this.userModel.findOne({ email: toEmail }).exec();
        if (!toUser) {
            throw new NotFoundException('User not found with this email');
        }

        // Can't send request to yourself
        if (toUser._id.toString() === fromUserId) {
            throw new BadRequestException('You cannot send a friend request to yourself');
        }

        // Check if already friends
        const existingFriendship = await this.friendRequestModel.findOne({
            $or: [
                { from: fromUserId, to: toUser._id, status: 'accepted' },
                { from: toUser._id, to: fromUserId, status: 'accepted' },
            ],
        }).exec();

        if (existingFriendship) {
            throw new ConflictException('You are already friends with this user');
        }

        // Check if pending request already exists
        const existingRequest = await this.friendRequestModel.findOne({
            $or: [
                { from: fromUserId, to: toUser._id, status: 'pending' },
                { from: toUser._id, to: fromUserId, status: 'pending' },
            ],
        }).exec();

        if (existingRequest) {
            throw new ConflictException('Friend request already exists');
        }

        // Create new friend request
        const friendRequest = new this.friendRequestModel({
            from: new Types.ObjectId(fromUserId),
            to: toUser._id,
            status: 'pending',
        });

        await friendRequest.save();
        this.logger.log(`Friend request saved with ID: ${friendRequest._id}`);

        // 🔔 Send real-time notification to recipient
        try {
            this.eventsGateway.sendFriendRequestNotification(
                toUser._id.toString(),
                {
                    id: fromUser._id.toString(),
                    name: fromUser.name,
                    email: fromUser.email,
                }
            );
        } catch (error) {
            this.logger.warn(`Failed to send real-time notification: ${error.message}`);
        }

        return {
            message: 'Friend request sent successfully',
            request: {
                id: friendRequest._id,
                to: {
                    id: toUser._id,
                    name: toUser.name,
                    email: toUser.email,
                },
                status: friendRequest.status,
            }
        };
    }

    // Get pending friend requests received
    async getPendingRequests(userId: string) {
        // this.logger.log(`Getting pending requests for user: ${userId}`);

        try {
            const requests = await this.friendRequestModel
                .find({ to: new Types.ObjectId(userId), status: 'pending' })
                .populate('from', 'name email isOnline')
                .sort({ createdAt: -1 })
                .exec();

            // this.logger.log(`Found ${requests.length} pending requests`);

            return requests.map(req => ({
                id: req._id,
                from: req.from,
                status: req.status,
                createdAt: (req as unknown as { createdAt: Date }).createdAt,
            }));
        } catch (error) {
            this.logger.error(`Error getting pending requests: ${error.message}`);
            throw error;
        }
    }

    // Get sent friend requests
    async getSentRequests(userId: string) {
        // this.logger.log(`Getting sent requests for user: ${userId}`);

        try {
            const requests = await this.friendRequestModel
                .find({ from: new Types.ObjectId(userId), status: 'pending' })
                .populate('to', 'name email isOnline')
                .sort({ createdAt: -1 })
                .exec();

            // this.logger.log(`Found ${requests.length} sent requests`);

            return requests.map(req => ({
                id: req._id,
                to: req.to,
                status: req.status,
                createdAt: (req as unknown as { createdAt: Date }).createdAt,
            }));
        } catch (error) {
            this.logger.error(`Error getting sent requests: ${error.message}`);
            throw error;
        }
    }

    // Accept or reject a friend request
    async respondToRequest(userId: string, requestId: string, action: 'accepted' | 'rejected') {
        this.logger.log(`User ${userId} responding to request ${requestId} with action: ${action}`);

        // Find the current user
        const currentUser = await this.userModel.findById(userId).exec();
        if (!currentUser) {
            throw new NotFoundException('User not found');
        }

        const request = await this.friendRequestModel.findOne({
            _id: new Types.ObjectId(requestId),
            to: new Types.ObjectId(userId),
            status: 'pending',
        }).populate('from', 'name email').exec();

        if (!request) {
            throw new NotFoundException('Friend request not found');
        }

        request.status = action;
        await request.save();

        // Get sender info
        const sender = request.from as unknown as { _id: Types.ObjectId; name: string; email: string };

        // 🔔 Send real-time notification to sender
        try {
            if (action === 'accepted') {
                this.eventsGateway.sendFriendRequestAccepted(
                    sender._id.toString(),
                    {
                        id: currentUser._id.toString(),
                        name: currentUser.name,
                        email: currentUser.email,
                    }
                );
            } else {
                this.eventsGateway.sendFriendRequestRejected(
                    sender._id.toString(),
                    {
                        id: currentUser._id.toString(),
                        name: currentUser.name,
                    }
                );
            }
        } catch (error) {
            this.logger.warn(`Failed to send real-time notification: ${error.message}`);
        }

        return {
            message: action === 'accepted'
                ? 'Friend request accepted'
                : 'Friend request rejected',
        };
    }

    // Get all friends
    async getFriends(userId: string) {
        // this.logger.log(`Getting friends for user: ${userId}`);

        try {
            const friendships = await this.friendRequestModel
                .find({
                    $or: [
                        { from: new Types.ObjectId(userId), status: 'accepted' },
                        { to: new Types.ObjectId(userId), status: 'accepted' },
                    ],
                })
                .populate('from', 'name email isOnline')
                .populate('to', 'name email isOnline')
                .exec();

            // this.logger.log(`Found ${friendships.length} friendships`);

            // Extract the friend (the other person in each friendship)
            const friends = friendships.map(friendship => {
                const from = friendship.from as unknown as { _id: Types.ObjectId; name: string; email: string; isOnline: boolean };
                const to = friendship.to as unknown as { _id: Types.ObjectId; name: string; email: string; isOnline: boolean };

                if (from._id.toString() === userId) {
                    return {
                        id: to._id,
                        name: to.name,
                        email: to.email,
                        isOnline: to.isOnline || this.eventsGateway.isUserOnline(to._id.toString()),
                    };
                } else {
                    return {
                        id: from._id,
                        name: from.name,
                        email: from.email,
                        isOnline: from.isOnline || this.eventsGateway.isUserOnline(from._id.toString()),
                    };
                }
            });

            return friends;
        } catch (error) {
            this.logger.error(`Error getting friends: ${error.message}`);
            throw error;
        }
    }

    // Remove a friend
    async removeFriend(userId: string, friendEmail: string) {
        const friend = await this.userModel.findOne({ email: friendEmail }).exec();
        if (!friend) {
            throw new NotFoundException('User not found');
        }

        const result = await this.friendRequestModel.deleteOne({
            $or: [
                { from: new Types.ObjectId(userId), to: friend._id, status: 'accepted' },
                { from: friend._id, to: new Types.ObjectId(userId), status: 'accepted' },
            ],
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException('Friendship not found');
        }

        return { message: 'Friend removed successfully' };
    }

    // Get friends count
    async getFriendsCount(userId: string) {
        const count = await this.friendRequestModel.countDocuments({
            $or: [
                { from: new Types.ObjectId(userId), status: 'accepted' },
                { to: new Types.ObjectId(userId), status: 'accepted' },
            ],
        }).exec();

        return { count };
    }

    // Get online friends count
    async getOnlineFriendsCount(userId: string) {
        try {
            const friends = await this.getFriends(userId);
            const onlineCount = friends.filter(f => f.isOnline).length;
            return { count: onlineCount };
        } catch (error) {
            this.logger.error(`Error getting online friends count: ${error.message}`);
            return { count: 0 };
        }
    }

    // Cancel a sent friend request
    async cancelRequest(userId: string, requestId: string) {
        const result = await this.friendRequestModel.deleteOne({
            _id: new Types.ObjectId(requestId),
            from: new Types.ObjectId(userId),
            status: 'pending',
        }).exec();

        if (result.deletedCount === 0) {
            throw new NotFoundException('Friend request not found');
        }

        return { message: 'Friend request cancelled' };
    }
}
