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
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  create(@GetUser() user: JwtPayload, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.businessId, user.id, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findAll(
    @GetUser() user: JwtPayload,
    @Query('productId') productId?: string,
    @Query('month') month?: string,
    @Query('paymentStatus') paymentStatus?: string,
  ) {
    return this.salesService.findAll(user.businessId, {
      productId,
      month,
      paymentStatus,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findOne(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.findOne(user.businessId, id);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  delete(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.delete(user.businessId, id);
  }
}
