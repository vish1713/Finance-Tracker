import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { QUEUE_NAMES } from '../queue/queue.constants';
import { EmailProcessor } from './email.processor';
import { MailerService } from './mailer.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [BullModule.registerQueue({ name: QUEUE_NAMES.EMAIL })],
  controllers: [NotificationsController],
  providers: [NotificationsService, MailerService, EmailProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
