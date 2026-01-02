import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AnonymousRoomController } from './anonymous-room.controller';
import { AnonymousRoomService } from './anonymous-room.service';
import { AnonymousRoomGateway } from './anonymous-room.gateway';
import { AnonymousRoom, AnonymousRoomSchema } from './schema/anonymous-room.schema';
import { AnonymousMessage, AnonymousMessageSchema } from './schema/anonymous-message.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AnonymousRoom.name, schema: AnonymousRoomSchema },
            { name: AnonymousMessage.name, schema: AnonymousMessageSchema },
        ]),
        ScheduleModule.forRoot(),
    ],
    controllers: [AnonymousRoomController],
    providers: [AnonymousRoomService, AnonymousRoomGateway],
    exports: [AnonymousRoomService],
})
export class AnonymousRoomModule {}
