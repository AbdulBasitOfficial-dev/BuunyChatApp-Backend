import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FriendService } from './friend.service';
import { FriendController } from './friend.controller';
import { FriendRequest, FriendRequestSchema } from './schema/friend-request.schema';
import { User, UserSchema } from '../user/schema/user.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: FriendRequest.name, schema: FriendRequestSchema },
            { name: User.name, schema: UserSchema },
        ]),
    ],
    controllers: [FriendController],
    providers: [FriendService],
    exports: [FriendService],
})
export class FriendModule { }
