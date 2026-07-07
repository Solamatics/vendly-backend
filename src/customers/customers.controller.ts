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
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, DebtPaymentDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '../../generated/prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  @Roles(Role.ADMIN, Role.MANAGER)
  create(@GetUser() user: JwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.businessId, dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findAll(@GetUser() user: JwtPayload) {
    return this.customersService.findAll(user.businessId);
  }

  @Get('debtors')
  @Roles(Role.ADMIN, Role.MANAGER)
  getDebtors(@GetUser() user: JwtPayload) {
    return this.customersService.getDebtors(user.businessId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.MANAGER, Role.STAFF)
  findOne(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.findOne(user.businessId, id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.MANAGER)
  update(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.remove(user.businessId, id);
  }

  @Post(':id/debt-payment')
  @Roles(Role.ADMIN, Role.MANAGER)
  recordDebtPayment(
    @GetUser() user: JwtPayload,
    @Param('id') customerId: string,
    @Body() dto: DebtPaymentDto,
  ) {
    return this.customersService.recordDebtPayment(
      user.businessId,
      customerId,
      dto,
    );
  }
}
