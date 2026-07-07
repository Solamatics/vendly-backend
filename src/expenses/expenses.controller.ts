import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@GetUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.businessId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER)
  findAll(
    @GetUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('month') month?: string,
  ) {
    return this.expensesService.findAll(user.businessId, { category, month });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.remove(user.businessId, id);
  }
}
