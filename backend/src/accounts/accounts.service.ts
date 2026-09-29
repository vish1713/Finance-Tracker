import { Injectable } from '@nestjs/common';
import { TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { assertOwned } from '../common/utils/ownership.util';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateAccountDto) {
    const openingBalance = dto.openingBalance ?? 0;
    return this.prisma.account.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        currency: dto.currency ?? 'USD',
        color: dto.color,
        icon: dto.icon,
        openingBalance,
        balance: openingBalance,
      },
    });
  }

  async findAll(userId: string, includeArchived = false) {
    return this.prisma.account.findMany({
      where: { userId, ...(includeArchived ? {} : { isArchived: false }) },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findUnique({ where: { id } });
    assertOwned(account, userId, 'Account');
    return account;
  }

  async update(userId: string, id: string, dto: UpdateAccountDto) {
    await this.findOne(userId, id);
    return this.prisma.account.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    const transactionCount = await this.prisma.transaction.count({
      where: { OR: [{ accountId: id }, { transferAccountId: id }] },
    });
    if (transactionCount > 0) {
      // Preserve ledger history — archive instead of hard-deleting an account with activity.
      return this.prisma.account.update({ where: { id }, data: { isArchived: true } });
    }
    await this.prisma.account.delete({ where: { id } });
    return { deleted: true };
  }

  /** Recomputes `balance` from openingBalance + the transaction ledger — a reconciliation safety net, not the hot read path. */
  async recomputeBalance(userId: string, id: string) {
    const account = await this.findOne(userId, id);

    const [outgoing, incoming] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where: { accountId: id },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: { transferAccountId: id, type: TransactionType.TRANSFER },
        _sum: { amount: true },
      }),
    ]);

    let delta = 0;
    for (const row of outgoing) {
      const sum = Number(row._sum.amount ?? 0);
      if (row.type === TransactionType.INCOME) delta += sum;
      else if (row.type === TransactionType.EXPENSE) delta -= sum;
      else if (row.type === TransactionType.TRANSFER) delta -= sum; // outgoing side of a transfer
    }
    delta += Number(incoming._sum.amount ?? 0); // incoming side of transfers into this account

    const balance = Number(account.openingBalance) + delta;
    return this.prisma.account.update({ where: { id }, data: { balance } });
  }
}
