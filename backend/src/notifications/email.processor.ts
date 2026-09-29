import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { MailerService } from './mailer.service';

export interface SendEmailJobData {
  to: string;
  subject: string;
  html: string;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<SendEmailJobData>): Promise<void> {
    await this.mailer.send(job.data.to, job.data.subject, job.data.html);
    this.logger.log(`Sent email "${job.data.subject}" to ${job.data.to}`);
  }
}
