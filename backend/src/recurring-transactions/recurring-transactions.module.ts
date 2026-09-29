import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { TransactionsModule } from '../transactions/transactions.module';
import { RecurringProcessor } from './recurring.processor';
import { RecurringScheduler } from './recurring.scheduler';
import { RecurringTransactionsController } from './recurring-transactions.controller';
import { RecurringTransactionsService } from './recurring-transactions.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.RECURRING_TRANSACTIONS }),
    TransactionsModule,
  ],
  controllers: [RecurringTransactionsController],
  providers: [RecurringTransactionsService, RecurringScheduler, RecurringProcessor],
  exports: [RecurringTransactionsService],
})
export class RecurringTransactionsModule {}
