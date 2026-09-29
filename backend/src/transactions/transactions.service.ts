import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { CacheService } from '../cache/cache.service';
import { assertOwned } from '../common/utils/ownership.util';
import { paginate } from '../common/dto/pagination-query.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

type Deltas = Map<string, number>;

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async create(
    userId: string,
    dto: CreateTransactionDto,
    opts?: { recurringTransactionId?: string },
  ) {
    await this.assertAccountOwned(userId, dto.accountId);
    if (dto.categoryId) await this.assertCategoryUsable(userId, dto.categoryId);

    let transferAccountId: string | undefined;
    if (dto.type === TransactionType.TRANSFER) {
      if (!dto.transferAccountId) {
        throw new BadRequestException('transferAccountId is required for a TRANSFER transaction');
      }
      if (dto.transferAccountId === dto.accountId) {
        throw new BadRequestException('Cannot transfer to the same account');
      }
      await this.assertAccountOwned(userId, dto.transferAccountId);
      transferAccountId = dto.transferAccountId;
    }

    const deltas = this.computeDeltas(dto.type, dto.amount, dto.accountId, transferAccountId);

    const transaction = await this.prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          userId,
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type: dto.type,
          amount: dto.amount,
          date: dto.date,
          description: dto.description,
          notes: dto.notes,
          attachmentUrl: dto.attachmentUrl,
          transferAccountId,
          recurringTransactionId: opts?.recurringTransactionId,
        },
      });
      await this.applyDeltas(tx, deltas);
      return created;
    });
    await this.invalidateAnalyticsCache(userId);
    return transaction;
  }

  async findAll(userId: string, query: QueryTransactionDto) {
    const where: Prisma.TransactionWhereInput = {
      userId,
      accountId: query.accountId,
      categoryId: query.categoryId,
      type: query.type,
      date: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
      description: query.q ? { contains: query.q, mode: 'insensitive' } : undefined,
    };

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { date: 'desc' },
        include: { category: true, account: true, transferAccount: true },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return paginate(items, total, query.page ?? 1, query.limit ?? 20);
  }

  async findOne(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id },
      include: { category: true, account: true, transferAccount: true },
    });
    assertOwned(transaction, userId, 'Transaction');
    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    assertOwned(existing, userId, 'Transaction');

    const accountId = dto.accountId ?? existing.accountId;
    const type = dto.type ?? existing.type;
    const amount = dto.amount ?? Number(existing.amount);
    let transferAccountId: string | undefined = existing.transferAccountId ?? undefined;

    if (accountId !== existing.accountId) await this.assertAccountOwned(userId, accountId);
    if (dto.categoryId) await this.assertCategoryUsable(userId, dto.categoryId);

    if (type === TransactionType.TRANSFER) {
      transferAccountId = dto.transferAccountId ?? transferAccountId;
      if (!transferAccountId) {
        throw new BadRequestException('transferAccountId is required for a TRANSFER transaction');
      }
      if (transferAccountId === accountId) {
        throw new BadRequestException('Cannot transfer to the same account');
      }
      if (transferAccountId !== existing.transferAccountId) {
        await this.assertAccountOwned(userId, transferAccountId);
      }
    } else {
      transferAccountId = undefined;
    }

    const oldDeltas = this.computeDeltas(
      existing.type,
      Number(existing.amount),
      existing.accountId,
      existing.transferAccountId ?? undefined,
    );
    const newDeltas = this.computeDeltas(type, amount, accountId, transferAccountId);
    const netDeltas = this.mergeDeltas(this.negateDeltas(oldDeltas), newDeltas);

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.transaction.update({
        where: { id },
        data: {
          accountId,
          categoryId: dto.categoryId ?? existing.categoryId,
          type,
          amount,
          date: dto.date ?? existing.date,
          description: dto.description ?? existing.description,
          notes: dto.notes ?? existing.notes,
          attachmentUrl: dto.attachmentUrl ?? existing.attachmentUrl,
          transferAccountId: transferAccountId ?? null,
        },
      });
      await this.applyDeltas(tx, netDeltas);
      return result;
    });
    await this.invalidateAnalyticsCache(userId);
    return updated;
  }

  async remove(userId: string, id: string) {
    const existing = await this.prisma.transaction.findUnique({ where: { id } });
    assertOwned(existing, userId, 'Transaction');

    const reverseDeltas = this.negateDeltas(
      this.computeDeltas(
        existing.type,
        Number(existing.amount),
        existing.accountId,
        existing.transferAccountId ?? undefined,
      ),
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.delete({ where: { id } });
      await this.applyDeltas(tx, reverseDeltas);
    });
    await this.invalidateAnalyticsCache(userId);
    return { deleted: true };
  }

  private async invalidateAnalyticsCache(userId: string): Promise<void> {
    await this.cacheService.delByPrefix(`analytics:${userId}:`);
  }

  private async assertAccountOwned(userId: string, accountId: string) {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    assertOwned(account, userId, 'Account');
  }

  private async assertCategoryUsable(userId: string, categoryId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id: categoryId, OR: [{ userId: null }, { userId }] },
    });
    if (!category) throw new BadRequestException('Category not found or not accessible');
  }

  private computeDeltas(
    type: TransactionType,
    amount: number,
    accountId: string,
    transferAccountId?: string,
  ): Deltas {
    const deltas: Deltas = new Map();
    const add = (id: string, delta: number) => deltas.set(id, (deltas.get(id) ?? 0) + delta);

    if (type === TransactionType.INCOME) add(accountId, amount);
    else if (type === TransactionType.EXPENSE) add(accountId, -amount);
    else if (type === TransactionType.TRANSFER) {
      add(accountId, -amount);
      if (transferAccountId) add(transferAccountId, amount);
    }
    return deltas;
  }

  private mergeDeltas(...maps: Deltas[]): Deltas {
    const result: Deltas = new Map();
    for (const map of maps) {
      for (const [id, delta] of map) {
        result.set(id, (result.get(id) ?? 0) + delta);
      }
    }
    return result;
  }

  private negateDeltas(map: Deltas): Deltas {
    return new Map([...map].map(([id, delta]) => [id, -delta]));
  }

  private async applyDeltas(tx: Prisma.TransactionClient, deltas: Deltas) {
    await Promise.all(
      [...deltas]
        .filter(([, delta]) => delta !== 0)
        .map(([accountId, delta]) =>
          tx.account.update({ where: { id: accountId }, data: { balance: { increment: delta } } }),
        ),
    );
  }
}
