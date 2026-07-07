import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { InviteUserDto, AcceptInviteDto, UpdateRoleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  inviteUser(@GetUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(user.businessId, dto);
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  getUsers(@GetUser() user: JwtPayload) {
    return this.usersService.getUsers(user.businessId);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  updateRole(
    @GetUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(user.businessId, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  removeUser(@GetUser() user: JwtPayload, @Param('id') userId: string) {
    return this.usersService.removeUser(user.businessId, userId, user.id);
  }
}
