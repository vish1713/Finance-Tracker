import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService implements OnModuleInit {
  private readonly logger = new Logger(MailerService.name);
  private transporter: nodemailer.Transporter;
  private from: string;
  private enabled: boolean;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.enabled = this.config.get<boolean>('mail.enabled') ?? true;
    this.from = this.config.get<string>('mail.from') ?? 'no-reply@finance-tracker.local';

    const user = this.config.get<string>('mail.user');
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: false,
      auth: user ? { user, pass: this.config.get<string>('mail.password') } : undefined,
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`Mail disabled — skipping "${subject}" to ${to}`);
      return;
    }
    await this.transporter.sendMail({ from: this.from, to, subject, html });
  }
}
