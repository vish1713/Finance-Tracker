import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateRecurringTransactionDto } from './create-recurring-transaction.dto';

export class UpdateRecurringTransactionDto extends PartialType(CreateRecurringTransactionDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
