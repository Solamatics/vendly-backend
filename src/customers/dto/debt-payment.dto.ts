import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class DebtPaymentDto {
  @IsString()
  saleId!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsString()
  @IsOptional()
  note?: string;
}
