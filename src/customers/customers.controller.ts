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
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.type';

@Controller('customers')
@UseGuards(JwtAuthGuard)
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateCustomerDto) {
    return this.customersService.create(user.businessId, dto);
  }

  @Get()
  findAll(@GetUser() user: JwtPayload) {
    return this.customersService.findAll(user.businessId);
  }

  @Get('debtors')
  getDebtors(@GetUser() user: JwtPayload) {
    return this.customersService.getDebtors(user.businessId);
  }

  @Get(':id')
  findOne(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.findOne(user.businessId, id);
  }

  @Patch(':id')
  update(
    @GetUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.customersService.remove(user.businessId, id);
  }

  @Post(':id/debt-payment')
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
