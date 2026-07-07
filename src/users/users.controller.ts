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
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  inviteUser(@GetUser() user: JwtPayload, @Body() dto: InviteUserDto) {
    return this.usersService.inviteUser(user.businessId, dto);
  }

  @Post('accept-invite')
  acceptInvite(@Body() dto: AcceptInviteDto) {
    return this.usersService.acceptInvite(dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getUsers(@GetUser() user: JwtPayload) {
    return this.usersService.getUsers(user.businessId);
  }

  @Patch(':id/role')
  @UseGuards(JwtAuthGuard)
  updateRole(
    @GetUser() user: JwtPayload,
    @Param('id') userId: string,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(user.businessId, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  removeUser(@GetUser() user: JwtPayload, @Param('id') userId: string) {
    return this.usersService.removeUser(user.businessId, userId, user.id);
  }
}
