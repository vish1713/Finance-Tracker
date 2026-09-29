import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { TransactionsModule } from '../transactions/transactions.module';
import { BillReminderProcessor } from './bill-reminder.processor';
import { BillReminderScheduler } from './bill-reminder.scheduler';
import { BillsController } from './bills.controller';
import { BillsService } from './bills.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.BILL_REMINDERS }),
    TransactionsModule,
    NotificationsModule,
  ],
  controllers: [BillsController],
  providers: [BillsService, BillReminderScheduler, BillReminderProcessor],
  exports: [BillsService],
})
export class BillsModule {}
