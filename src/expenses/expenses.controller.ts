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
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpensesController {
  constructor(private expensesService: ExpensesService) {}

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(user.businessId, dto);
  }

  @Get()
  findAll(
    @GetUser() user: JwtPayload,
    @Query('category') category?: string,
    @Query('month') month?: string,
  ) {
    return this.expensesService.findAll(user.businessId, { category, month });
  }

  @Delete(':id')
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.expensesService.remove(user.businessId, id);
  }
}
