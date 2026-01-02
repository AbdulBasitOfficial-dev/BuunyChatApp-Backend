import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from '../user/schema/user.schema';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        private jwtService: JwtService,
    ) { }

    async register(name: string, email: string, password: string) {
        // Check if user already exists
        const existingUser = await this.userModel.findOne({ email }).exec();
        if (existingUser) {
            throw new ConflictException('User with this email already exists');
        }

        // Hash the password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create and save the user
        const newUser = new this.userModel({
            name,
            email,
            password: hashedPassword,
        });

        const savedUser = await newUser.save();

        // Generate JWT token
        const tokens = await this.generateTokens(savedUser);

        return {
            user: {
                id: savedUser._id,
                name: savedUser.name,
                email: savedUser.email,
                role: savedUser.role,
            },
            ...tokens,
        };
    }

    async login(email: string, password: string) {
        const user = await this.userModel.findOne({ email }).exec();
        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Update online status
        user.isOnline = true;
        await user.save();

        // Generate JWT token
        const tokens = await this.generateTokens(user);

        return {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
            ...tokens,
        };
    }

    async logout(email: string) {
        const user = await this.userModel.findOne({ email }).exec();
        if (user) {
            user.isOnline = false;
            await user.save();
        }
        return { message: 'Logged out successfully' };
    }

    private async generateTokens(user: UserDocument) {
        const payload: JwtPayload = {
            sub: user._id.toString(),
            email: user.email,
            role: user.role,
        };

        const accessToken = this.jwtService.sign(payload, {
            expiresIn: '15m', // Access token expires in 15 minutes
        });

        const refreshToken = this.jwtService.sign(payload, {
            expiresIn: '7d', // Refresh token expires in 7 days
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    async refreshTokens(refreshToken: string) {
        try {
            const payload = this.jwtService.verify<JwtPayload>(refreshToken);

            const user = await this.userModel.findById(payload.sub).exec();
            if (!user) {
                throw new UnauthorizedException('User not found');
            }

            return this.generateTokens(user);
        } catch {
            throw new UnauthorizedException('Invalid refresh token');
        }
    }
}
