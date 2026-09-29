import { Injectable } from '@nestjs/common';
import { Bill, NotificationType, RecurrenceFrequency, TransactionType } from '@prisma/client';
import { addDays, addMonths, addWeeks, addYears, isSameDay, subDays } from 'date-fns';
import { assertOwned } from '../common/utils/ownership.util';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { UpdateBillDto } from './dto/update-bill.dto';

@Injectable()
export class BillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionsService: TransactionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, dto: CreateBillDto) {
    if (dto.accountId) {
      const account = await this.prisma.account.findUnique({ where: { id: dto.accountId } });
      assertOwned(account, userId, 'Account');
    }
    return this.prisma.bill.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        dueDate: dto.dueDate,
        frequency: dto.frequency,
        accountId: dto.accountId,
        categoryId: dto.categoryId,
        reminderDaysBefore: dto.reminderDaysBefore ?? 3,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.bill.findMany({ where: { userId }, orderBy: { dueDate: 'asc' } });
  }

  async findOne(userId: string, id: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id } });
    assertOwned(bill, userId, 'Bill');
    return bill;
  }

  async update(userId: string, id: string, dto: UpdateBillDto) {
    await this.findOne(userId, id);
    return this.prisma.bill.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);
    await this.prisma.bill.delete({ where: { id } });
    return { deleted: true };
  }

  /** Marks a bill paid, optionally logging the expense, and rolls a recurring bill forward to its next due date. */
  async markPaid(userId: string, id: string) {
    const bill = await this.findOne(userId, id);
    if (bill.isPaid) return bill;

    if (bill.accountId) {
      await this.transactionsService.create(userId, {
        accountId: bill.accountId,
        categoryId: bill.categoryId ?? undefined,
        type: TransactionType.EXPENSE,
        amount: Number(bill.amount),
        date: new Date(),
        description: `Bill payment: ${bill.name}`,
      });
    }

    if (bill.frequency) {
      const nextDueDate = this.shiftByFrequency(bill.dueDate, bill.frequency);
      return this.prisma.bill.update({
        where: { id },
        data: { isPaid: false, dueDate: nextDueDate, lastReminderSentAt: null },
      });
    }

    return this.prisma.bill.update({ where: { id }, data: { isPaid: true } });
  }

  /** Scans unpaid bills and sends a (deduplicated, once-per-day) reminder notification/email once within `reminderDaysBefore` of the due date. */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const candidates = await this.prisma.bill.findMany({ where: { isPaid: false } });

    let sent = 0;
    for (const bill of candidates) {
      const reminderDate = subDays(bill.dueDate, bill.reminderDaysBefore);
      const alreadySentToday = bill.lastReminderSentAt && isSameDay(bill.lastReminderSentAt, now);
      if (now >= reminderDate && !alreadySentToday) {
        await this.notifyReminder(bill);
        await this.prisma.bill.update({
          where: { id: bill.id },
          data: { lastReminderSentAt: now },
        });
        sent++;
      }
    }
    return sent;
  }

  private async notifyReminder(bill: Bill): Promise<void> {
    const dueDateText = bill.dueDate.toDateString();
    await this.notificationsService.notify(
      bill.userId,
      NotificationType.BILL_REMINDER,
      `Upcoming bill: ${bill.name}`,
      `${bill.name} (${bill.amount}) is due on ${dueDateText}.`,
      {
        metadata: { billId: bill.id },
        email: {
          subject: `Reminder: ${bill.name} is due soon`,
          html: `<p><strong>${bill.name}</strong> of ${bill.amount} is due on ${dueDateText}.</p>`,
        },
      },
    );
  }

  private shiftByFrequency(date: Date, frequency: RecurrenceFrequency): Date {
    switch (frequency) {
      case RecurrenceFrequency.DAILY:
        return addDays(date, 1);
      case RecurrenceFrequency.WEEKLY:
        return addWeeks(date, 1);
      case RecurrenceFrequency.YEARLY:
        return addYears(date, 1);
      case RecurrenceFrequency.MONTHLY:
      default:
        return addMonths(date, 1);
    }
  }
}
