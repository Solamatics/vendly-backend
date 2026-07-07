import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateProductDto {
  @IsString()
  name!: string;

  @IsString()
  unit!: string;

  @IsNumber()
  @Min(0)
  sellingPrice!: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  lowStockAlert?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentStock?: number;

  @IsString()
  @IsOptional()
  branchId?: string;
}
