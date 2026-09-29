import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { BillsService } from './bills.service';

@Processor(QUEUE_NAMES.BILL_REMINDERS)
export class BillReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(BillReminderProcessor.name);

  constructor(private readonly billsService: BillsService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    const sent = await this.billsService.sendDueReminders();
    if (sent > 0) {
      this.logger.log(`Sent ${sent} bill reminder(s)`);
    }
  }
}
