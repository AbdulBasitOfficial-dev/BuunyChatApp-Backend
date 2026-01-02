import { IsNotEmpty, IsString, IsOptional, IsArray } from 'class-validator';

export class CreateGroupDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    memberIds?: string[];
}

export class AddMemberDto {
    @IsNotEmpty()
    @IsString()
    groupId: string;

    @IsNotEmpty()
    @IsString()
    memberId: string;
}

export class RemoveMemberDto {
    @IsNotEmpty()
    @IsString()
    groupId: string;

    @IsNotEmpty()
    @IsString()
    memberId: string;
}

export class LeaveGroupDto {
    @IsNotEmpty()
    @IsString()
    groupId: string;
}

export class SendGroupMessageDto {
    @IsNotEmpty()
    @IsString()
    groupId: string;

    @IsNotEmpty()
    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    clientId?: string;
}

export class UpdateGroupDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    description?: string;
}
