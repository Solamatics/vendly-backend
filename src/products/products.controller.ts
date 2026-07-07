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
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@GetUser() user: JwtPayload, @Body() dto: CreateProductDto) {
    return this.productsService.create(user.businessId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findAll(@GetUser() user: JwtPayload) {
    return this.productsService.findAll(user.businessId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findOne(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.findOne(user.businessId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.productsService.remove(user.businessId, id);
  }

  @Patch(':id/stock')
  @Roles(Role.ADMIN, Role.MANAGER)
  updateStock(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: { action: 'add' | 'set'; quantity: number; note?: string },
  ) {
    return this.productsService.updateStock(
      user.businessId,
      id,
      body.action,
      body.quantity,
      body.note,
    );
  }
}
