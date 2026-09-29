import { IsNumber, IsPositive } from 'class-validator';

export class AddValueSnapshotDto {
  @IsNumber()
  @IsPositive()
  value: number;
}
