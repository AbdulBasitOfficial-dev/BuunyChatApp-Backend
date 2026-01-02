import { IsString, IsArray, IsOptional, MaxLength, MinLength } from 'class-validator';

export class CreateAnonymousRoomDto {
    @IsString()
    @MinLength(3)
    @MaxLength(50)
    roomName: string;

    @IsArray()
    @IsString({ each: true })
    @MaxLength(20, { each: true })
    tags: string[];
}

export class JoinAnonymousRoomDto {
    @IsString()
    roomId: string;
}

export class SendAnonymousMessageDto {
    @IsString()
    roomId: string;

    @IsString()
    @MinLength(1)
    @MaxLength(1000)
    content: string;

    @IsOptional()
    @IsString()
    clientId?: string;
}
