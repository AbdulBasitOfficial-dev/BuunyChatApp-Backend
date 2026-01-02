import { IsEmail, IsNotEmpty, IsString, IsIn } from 'class-validator';

export class SendFriendRequestDto {
    @IsNotEmpty()
    @IsEmail()
    toEmail: string;
}

export class RespondToRequestDto {
    @IsNotEmpty()
    @IsString()
    requestId: string;

    @IsNotEmpty()
    @IsIn(['accepted', 'rejected'])
    action: 'accepted' | 'rejected';
}

export class RemoveFriendDto {
    @IsNotEmpty()
    @IsEmail()
    friendEmail: string;
}
