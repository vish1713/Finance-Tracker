import { Injectable } from '@nestjs/common';
import { BudgetPeriod, TransactionType } from '@prisma/client';
import { addMonths, addWeeks, addYears, subMonths, subWeeks, subYears } from 'date-fns';
import { CacheService } from '../cache/cache.service';
import { assertOwned } from '../common/utils/ownership.util';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

export interface BudgetProgress {
  budget: Awaited<ReturnType<BudgetsService['findOne']>>;
  periodStart: Date;
  periodEnd: Date;
  spent: number;
  effectiveAmount: number;
  remaining: number;
  percentUsed: number;
}

@Injectable()
export class BudgetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async create(userId: string, dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount,
        period: dto.period ?? BudgetPeriod.MONTHLY,
        startDate: dto.startDate,
        rollover: dto.rollover ?? false,
      },
    });
    await this.cacheService.delByPrefix(`analytics:${userId}:`);
    return budget;
  }

  async findAll(userId: string) {
    return this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { category: true },
    });
    assertOwned(budget, userId, 'Budget');
    return budget;
  }

  async update(userId: string, id: string, dto: UpdateBudgetDto) {
    await this.findOne(userId, id);
    const budget = await this.prisma.budget.update({ where: { id }, data: dto });
    await this.cacheService.delByPrefix(`analytics:${userId}:`);
    return budget;
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.budget.delete({ where: { id } });
    await this.cacheService.delByPrefix(`analytics:${userId}:`);
    return { deleted: true };
  }

  async getProgress(userId: string, id: string): Promise<BudgetProgress> {
    const budget = await this.findOne(userId, id);
    return this.computeProgress(userId, budget);
  }

  async getAllProgress(userId: string): Promise<BudgetProgress[]> {
    const budgets = await this.findAll(userId);
    return Promise.all(budgets.map((budget) => this.computeProgress(userId, budget)));
  }

  private async computeProgress(
    userId: string,
    budget: Awaited<ReturnType<BudgetsService['findOne']>>,
  ): Promise<BudgetProgress> {
    const now = new Date();
    const { periodStart, periodEnd } = this.getCurrentPeriodWindow(
      budget.startDate,
      budget.period,
      now,
    );
    const spent = await this.sumExpenses(userId, budget.categoryId, periodStart, periodEnd);

    let effectiveAmount = Number(budget.amount);
    // Rollover only carries the immediately preceding period's surplus/deficit forward,
    // not a full cumulative history — keeps the calculation bounded and predictable.
    if (budget.rollover) {
      const prevStart = this.shiftPeriod(periodStart, budget.period, -1);
      if (prevStart >= budget.startDate) {
        const prevSpent = await this.sumExpenses(userId, budget.categoryId, prevStart, periodStart);
        effectiveAmount += Number(budget.amount) - prevSpent;
      }
    }

    const remaining = effectiveAmount - spent;
    const percentUsed = effectiveAmount > 0 ? (spent / effectiveAmount) * 100 : 0;

    return { budget, periodStart, periodEnd, spent, effectiveAmount, remaining, percentUsed };
  }

  private async sumExpenses(
    userId: string,
    categoryId: string | null,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        categoryId: categoryId ?? undefined,
        date: { gte: periodStart, lt: periodEnd },
      },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private getCurrentPeriodWindow(startDate: Date, period: BudgetPeriod, now: Date) {
    let periodStart = new Date(startDate);
    let periodEnd = this.shiftPeriod(periodStart, period, 1);

    if (now < periodStart) return { periodStart, periodEnd };

    while (periodEnd <= now) {
      periodStart = periodEnd;
      periodEnd = this.shiftPeriod(periodStart, period, 1);
    }
    return { periodStart, periodEnd };
  }

  private shiftPeriod(date: Date, period: BudgetPeriod, count: number): Date {
    switch (period) {
      case BudgetPeriod.WEEKLY:
        return count >= 0 ? addWeeks(date, count) : subWeeks(date, -count);
      case BudgetPeriod.YEARLY:
        return count >= 0 ? addYears(date, count) : subYears(date, -count);
      case BudgetPeriod.MONTHLY:
      default:
        return count >= 0 ? addMonths(date, count) : subMonths(date, -count);
    }
  }
}
