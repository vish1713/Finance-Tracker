import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { Queue } from 'bullmq';
import { assertOwned } from '../common/utils/ownership.util';
import { PrismaService } from '../prisma/prisma.service';
import { JOB_NAMES, QUEUE_NAMES } from '../queue/queue.constants';

export interface EmailContent {
  subject: string;
  html: string;
}

export interface NotifyOptions {
  metadata?: Prisma.InputJsonValue;
  email?: EmailContent;
}

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    options?: NotifyOptions,
  ) {
    const notification = await this.prisma.notification.create({
      data: { userId, type, title, message, metadata: options?.metadata },
    });

    if (options?.email) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) {
        await this.emailQueue.add(JOB_NAMES.SEND_EMAIL, {
          to: user.email,
          subject: options.email.subject,
          html: options.email.html,
        });
      }
    }

    return notification;
  }

  async findAll(userId: string, unreadOnly = false) {
    return this.prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findUnique({ where: { id } });
    assertOwned(notification, userId, 'Notification');
    return this.prisma.notification.update({ where: { id }, data: { isRead: true } });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { updated: true };
  }
}
