import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import * as bcrypt from 'bcrypt';

interface UpdateProfileDto {
    name?: string;
    bio?: string;
    status?: string;
    profileColor?: string;
    avatar?: string;
}

@Injectable()
export class UserService {
    constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

    async findUser(email: string) {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return result;
    }

    async findUserById(userId: string) {
        const user = await this.userModel.findById(userId).exec();
        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return result;
    }

    async updateUser(email: string, name: string) {
        const user = await this.userModel.findOneAndUpdate(
            { email },
            { name },
            { new: true }
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return result;
    }

    async updateProfile(userId: string, updates: UpdateProfileDto) {
        const updateData: any = {};
        
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.bio !== undefined) updateData.bio = updates.bio;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.profileColor !== undefined) updateData.profileColor = updates.profileColor;
        if (updates.avatar !== undefined) updateData.avatar = updates.avatar;

        const user = await this.userModel.findByIdAndUpdate(
            userId,
            updateData,
            { new: true }
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return {
            id: result._id,
            name: result.name,
            email: result.email,
            role: result.role,
            bio: result.bio,
            status: result.status,
            profileColor: result.profileColor,
            avatar: result.avatar,
        };
    }

    async deleteUser(email: string) {
        const result = await this.userModel.deleteOne({ email }).exec();
        if (result.deletedCount === 0) {
            throw new NotFoundException('User not found');
        }

        return { message: 'User successfully deleted' };
    }

    async findAllUsers() {
        const users = await this.userModel.find().select('-password').exec();
        return users;
    }

    async updateOnlineStatus(email: string, isOnline: boolean) {
        const user = await this.userModel.findOneAndUpdate(
            { email },
            { isOnline },
            { new: true }
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return result;
    }

    async updatePassword(userId: string, currentPassword: string, newPassword: string) {
        const user = await this.userModel.findById(userId).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            throw new NotFoundException('Current password is incorrect');
        }

        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

        await this.userModel.findByIdAndUpdate(userId, { password: hashedPassword }).exec();

        return { message: 'Password successfully updated' };
    }

    async updateRole(email: string, role: 'user' | 'admin') {
        const user = await this.userModel.findOneAndUpdate(
            { email },
            { role },
            { new: true }
        ).exec();

        if (!user) {
            throw new NotFoundException('User not found');
        }

        const { password: _, ...result } = user.toObject();
        return result;
    }
}
