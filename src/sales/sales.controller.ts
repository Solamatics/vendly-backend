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
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  constructor(private salesService: SalesService) {}

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateSaleDto) {
    return this.salesService.create(user.businessId, user.id, dto);
  }

  @Get()
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
  findOne(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.findOne(user.businessId, id);
  }

  @Delete(':id')
  delete(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.salesService.delete(user.businessId, id);
  }
}
