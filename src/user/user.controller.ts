import { Controller, Post, Body, Delete, Get, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
    FindUserDto,
    UpdateUserDto,
    DeleteUserDto,
    UpdateOnlineStatusDto,
    UpdatePasswordDto,
    UpdateRoleDto,
    UpdateProfileDto,
    ChangePasswordDto,
} from './schema/dto/user.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) { }

    // All user routes are protected by default (JWT Guard applied globally)

    @Get('me')
    getMe(@CurrentUser() user: { userId: string; email: string; role: string }) {
        return this.userService.findUserById(user.userId);
    }

    @Get('find')
    findUser(@Body() findUserDto: FindUserDto) {
        return this.userService.findUser(findUserDto.email);
    }

    @Patch('update')
    updateUser(@Body() updateUserDto: UpdateUserDto) {
        return this.userService.updateUser(updateUserDto.email, updateUserDto.name);
    }

    @Patch('profile')
    updateProfile(
        @CurrentUser() user: { userId: string },
        @Body() dto: UpdateProfileDto,
    ) {
        return this.userService.updateProfile(user.userId, dto);
    }

    @Patch('password')
    changePassword(
        @CurrentUser() user: { userId: string },
        @Body() dto: ChangePasswordDto,
    ) {
        return this.userService.updatePassword(user.userId, dto.currentPassword, dto.newPassword);
    }

    @Delete()
    deleteUser(@Body() deleteUserDto: DeleteUserDto) {
        return this.userService.deleteUser(deleteUserDto.email);
    }

    @Get()
    @UseGuards(RolesGuard)
    @Roles('admin')
    findAllUsers() {
        return this.userService.findAllUsers();
    }

    @Patch('updateOnlineStatus')
    updateOnlineStatus(@Body() updateOnlineStatusDto: UpdateOnlineStatusDto) {
        return this.userService.updateOnlineStatus(
            updateOnlineStatusDto.email,
            updateOnlineStatusDto.isOnline,
        );
    }

    @Patch('updatePassword')
    updatePassword(@Body() updatePasswordDto: UpdatePasswordDto) {
        // Legacy endpoint - kept for backward compatibility
        return { message: 'Please use PATCH /user/password instead' };
    }

    @Patch('updateRole')
    @UseGuards(RolesGuard)
    @Roles('admin')
    updateRole(@Body() updateRoleDto: UpdateRoleDto) {
        return this.userService.updateRole(updateRoleDto.email, updateRoleDto.role);
    }
}
