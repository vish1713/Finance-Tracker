import { Injectable, Logger } from '@nestjs/common';
import { RecurrenceFrequency, RecurringTransaction } from '@prisma/client';
import { addDays, addMonths, addWeeks, addYears } from 'date-fns';
import { assertOwned } from '../common/utils/ownership.util';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';

@Injectable()
export class RecurringTransactionsService {
  private readonly logger = new Logger(RecurringTransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
  ) {}

  async create(userId: string, dto: CreateRecurringTransactionDto) {
    const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
    assertOwned(account, userId, 'Account');

    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        type: dto.type,
        description: dto.description,
        frequency: dto.frequency,
        interval: dto.interval ?? 1,
        startDate: dto.startDate,
        endDate: dto.endDate,
        nextRunDate: dto.startDate,
        isActive: true,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      orderBy: { nextRunDate: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const recurring = await this.prisma.recurringTransaction.findUnique({ where: { id } });
    assertOwned(recurring, userId, 'Recurring transaction');
    return recurring;
  }

  async update(userId: string, id: string, dto: UpdateRecurringTransactionDto) {
    await this.findOne(userId, id);
    return this.prisma.recurringTransaction.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Materializes every due, active recurring transaction as a real Transaction and advances
   * nextRunDate by one period. If several periods have elapsed since the last run, this only
   * catches up one period per call — the item stays due and is picked up again on the next scan,
   * which bounds the work done in a single job run.
   */
  async processDue(now: Date = new Date()): Promise<number> {
    const due = await this.prisma.recurringTransaction.findMany({
      where: { isActive: true, nextRunDate: { lte: now } },
    });

    let processed = 0;
    for (const recurring of due) {
      try {
        await this.processOne(recurring);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process recurring transaction ${recurring.id}`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
    return processed;
  }

  private async processOne(recurring: RecurringTransaction): Promise<void> {
    const nextRunDate = this.shiftByFrequency(
      recurring.nextRunDate,
      recurring.frequency,
      recurring.interval,
    );
    const stillActive = !recurring.endDate || nextRunDate <= recurring.endDate;

    await this.transactionsService.create(
      recurring.userId,
      {
        accountId: recurring.accountId,
        categoryId: recurring.categoryId ?? undefined,
        type: recurring.type,
        amount: Number(recurring.amount),
        date: recurring.nextRunDate,
        description: recurring.description,
      },
      { recurringTransactionId: recurring.id },
    );

    await this.prisma.recurringTransaction.update({
      where: { id: recurring.id },
      data: { lastRunDate: recurring.nextRunDate, nextRunDate, isActive: stillActive },
    });
  }

  private shiftByFrequency(date: Date, frequency: RecurrenceFrequency, interval: number): Date {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return addDays(date, interval);
      case RecurrenceFrequency.WEEKLY:
        return addWeeks(date, interval);
      case RecurrenceFrequency.YEARLY:
        return addYears(date, interval);
      case RecurrenceFrequency.MONTHLY:
      default:
        return addMonths(date, interval);
    }
  }
}
