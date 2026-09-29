import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';

@Injectable()
export class BillReminderScheduler {
  constructor(@InjectQueue(QUEUE_NAMES.BILL_REMINDERS) private readonly queue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async scheduleScan() {
    await this.queue.add(JOB_NAMES.SCAN_BILL_REMINDERS, {});
  }
}
