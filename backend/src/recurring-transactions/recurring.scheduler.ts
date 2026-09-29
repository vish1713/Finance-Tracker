import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue } from 'bullmq';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';

@Injectable()
export class RecurringScheduler {
  constructor(@InjectQueue(QUEUE_NAMES.RECURRING_TRANSACTIONS) private readonly queue: Queue) {}

  @Cron(CronExpression.EVERY_HOUR)
  async scheduleProcessing() {
    await this.queue.add(JOB_NAMES.PROCESS_DUE_RECURRING, {});
  }
}
