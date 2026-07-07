import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../../../generated/prisma/client';

export class CreateSaleDto {
  @IsString()
  productId!: string;

  @IsString()
  @IsOptional()
  customerId?: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  amountPaid?: number;

  @IsEnum(PaymentStatus)
  @IsOptional()
  paymentStatus?: PaymentStatus;

  @IsString()
  @IsOptional()
  note?: string;

  @IsDateString()
  date!: string;

  @IsString()
  @IsOptional()
  branchId?: string;
}
