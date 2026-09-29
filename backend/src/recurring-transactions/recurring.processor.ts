import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { RecurringTransactionsService } from './recurring-transactions.service';

@Processor(QUEUE_NAMES.RECURRING_TRANSACTIONS)
export class RecurringProcessor extends WorkerHost {
  private readonly logger = new Logger(RecurringProcessor.name);

  constructor(private readonly recurringTransactionsService: RecurringTransactionsService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const processed = await this.recurringTransactionsService.processDue();
    if (processed > 0) {
      this.logger.log(`Processed ${processed} due recurring transaction(s)`);
    }
  }
}
