import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupService } from './group.service';
import { GroupController } from './group.controller';
import { Group, GroupSchema } from './schema/group.schema';
import { GroupMessage, GroupMessageSchema } from './schema/group-message.schema';
import { EventsModule } from '../events/events.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Group.name, schema: GroupSchema },
            { name: GroupMessage.name, schema: GroupMessageSchema },
        ]),
        forwardRef(() => EventsModule),
    ],
    controllers: [GroupController],
    providers: [GroupService],
    exports: [GroupService],
})
export class GroupModule { }
