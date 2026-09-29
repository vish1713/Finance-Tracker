import { InvestmentType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInvestmentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name: string;

  @IsEnum(InvestmentType)
  type: InvestmentType;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  purchasePrice: number;

  @Type(() => Date)
  @IsDate()
  purchaseDate: Date;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
