import { PartialType, OmitType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateAccountDto } from './create-account.dto';

export class UpdateAccountDto extends PartialType(
  OmitType(CreateAccountDto, ['openingBalance'] as const),
) {
  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}
