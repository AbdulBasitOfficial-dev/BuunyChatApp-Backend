import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
    @IsNotEmpty()
    @IsString()
    recipientId: string;

    @IsNotEmpty()
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    clientId?: string;
}
