import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { addDays, endOfMonth, format, startOfMonth, subMonths } from 'date-fns';
import { CacheService } from '../cache/cache.service';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryBreakdownQueryDto } from './dto/category-breakdown-query.dto';
import { TrendQueryDto } from './dto/trend-query.dto';

const CACHE_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getDashboardSummary(userId: string) {
    const cacheKey = `analytics:${userId}:dashboard`;
    const cached = await this.cacheService.get<Record<string, unknown>>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const sevenDaysOut = addDays(now, 7);

    const [accounts, monthIncome, monthExpense, upcomingBills, recentTransactions] =
      await Promise.all([
        this.prisma.account.findMany({ where: { userId, isArchived: false } }),
        this.sumByTypeInRange(userId, TransactionType.INCOME, monthStart, monthEnd),
        this.sumByTypeInRange(userId, TransactionType.EXPENSE, monthStart, monthEnd),
        this.prisma.bill.findMany({
          where: { userId, isPaid: false, dueDate: { lte: sevenDaysOut } },
          orderBy: { dueDate: 'asc' },
        }),
        this.prisma.transaction.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 5,
          include: { category: true, account: true },
        }),
      ]);

    const totalBalance = accounts.reduce((sum, account) => sum + Number(account.balance), 0);

    const summary = {
      totalBalance,
      accountCount: accounts.length,
      monthIncome,
      monthExpense,
      monthNet: monthIncome - monthExpense,
      upcomingBills,
      recentTransactions,
    };

    await this.cacheService.set(cacheKey, summary, CACHE_TTL_MS);
    return summary;
  }

  async getCategoryBreakdown(userId: string, query: CategoryBreakdownQueryDto) {
    const type = query.type ?? TransactionType.EXPENSE;
    const from = query.from ?? startOfMonth(new Date());
    const to = query.to ?? endOfMonth(new Date());
    const cacheKey = `analytics:${userId}:category:${type}:${from.toISOString()}:${to.toISOString()}`;

    const cached = await this.cacheService.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const grouped = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: { userId, type, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });

    const categoryIds = grouped.map((g) => g.categoryId).filter((id): id is string => Boolean(id));
    const categories = await this.prisma.category.findMany({ where: { id: { in: categoryIds } } });
    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    const result = grouped
      .map((g) => {
        const category = g.categoryId ? categoryMap.get(g.categoryId) : undefined;
        return {
          categoryId: g.categoryId,
          categoryName: g.categoryId ? (category?.name ?? 'Unknown') : 'Uncategorized',
          color: category?.color ?? null,
          amount: Number(g._sum.amount ?? 0),
        };
      })
      .sort((a, b) => b.amount - a.amount);

    await this.cacheService.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  async getIncomeExpenseTrend(userId: string, query: TrendQueryDto) {
    const months = query.months ?? 6;
    const cacheKey = `analytics:${userId}:trend:${months}`;
    const cached = await this.cacheService.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const now = new Date();
    const points = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const start = startOfMonth(monthDate);
      const end = endOfMonth(monthDate);
      const [income, expense] = await Promise.all([
        this.sumByTypeInRange(userId, TransactionType.INCOME, start, end),
        this.sumByTypeInRange(userId, TransactionType.EXPENSE, start, end),
      ]);
      points.push({ month: format(monthDate, 'yyyy-MM'), income, expense, net: income - expense });
    }

    await this.cacheService.set(cacheKey, points, CACHE_TTL_MS);
    return points;
  }

  /**
   * Net worth = opening balances + cumulative income - cumulative expense, up to each month end.
   * TRANSFER transactions are excluded deliberately: moving money between a user's own accounts
   * nets to zero (source -amount, destination +amount), so they never affect total net worth.
   */
  async getNetWorthTrend(userId: string, query: TrendQueryDto) {
    const months = query.months ?? 6;
    const cacheKey = `analytics:${userId}:networth:${months}`;
    const cached = await this.cacheService.get<unknown[]>(cacheKey);
    if (cached) return cached;

    const accounts = await this.prisma.account.findMany({ where: { userId } });
    const openingSum = accounts.reduce((sum, account) => sum + Number(account.openingBalance), 0);

    const now = new Date();
    const points = [];
    for (let i = months - 1; i >= 0; i--) {
      const monthEnd = endOfMonth(subMonths(now, i));
      const [income, expense] = await Promise.all([
        this.sumByTypeUpTo(userId, TransactionType.INCOME, monthEnd),
        this.sumByTypeUpTo(userId, TransactionType.EXPENSE, monthEnd),
      ]);
      points.push({ month: format(monthEnd, 'yyyy-MM'), netWorth: openingSum + income - expense });
    }

    await this.cacheService.set(cacheKey, points, CACHE_TTL_MS);
    return points;
  }

  private async sumByTypeInRange(
    userId: string,
    type: TransactionType,
    start: Date,
    end: Date,
  ): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: { userId, type, date: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }

  private async sumByTypeUpTo(userId: string, type: TransactionType, upTo: Date): Promise<number> {
    const result = await this.prisma.transaction.aggregate({
      where: { userId, type, date: { lte: upTo } },
      _sum: { amount: true },
    });
    return Number(result._sum.amount ?? 0);
  }
}
