import { IsString, IsEmail, IsBoolean, IsNotEmpty, IsIn, IsOptional, MinLength, Matches } from 'class-validator';

export class FindUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;
}

export class UpdateUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    name: string;
}

export class DeleteUserDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;
}

export class UpdateOnlineStatusDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsBoolean()
    isOnline: boolean;
}

export class UpdatePasswordDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsString()
    password: string;
}

export class UpdateRoleDto {
    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsNotEmpty()
    @IsIn(['user', 'admin'])
    role: 'user' | 'admin';
}

export class UpdateProfileDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    name?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsString()
    @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, { message: 'profileColor must be a valid hex color' })
    profileColor?: string;

    @IsOptional()
    @IsString()
    avatar?: string;
}

export class ChangePasswordDto {
    @IsNotEmpty()
    @IsString()
    currentPassword: string;

    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    newPassword: string;
}
