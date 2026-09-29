import { IsNumber, IsPositive } from 'class-validator';

export class ContributeGoalDto {
  @IsNumber()
  @IsPositive()
  amount: number;
}
