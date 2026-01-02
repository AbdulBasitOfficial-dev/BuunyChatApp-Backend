import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { FriendModule } from './friend/friend.module';
import { EventsModule } from './events/events.module';
import { ChatModule } from './chat/chat.module';
import { GroupModule } from './group/group.module';
import { AnonymousRoomModule } from './anonymous-room/anonymous-room.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uri = configService.get<string>('MONGODB_URL');
        if (!uri) {
          throw new Error('MONGODB_URL is not defined in the .env file.');
        }
        return { uri };
      },
      inject: [ConfigService],
    }),
    EventsModule,
    AuthModule,
    UserModule,
    FriendModule,
    ChatModule,
    GroupModule,
    AnonymousRoomModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Apply JWT Auth Guard globally - all routes are protected by default
    // Use @Public() decorator to make specific routes public
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule { }
