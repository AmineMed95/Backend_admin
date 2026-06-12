import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

import { User } from '../../users/user.entity';
import { EmailService } from '../../mail/mail.service';

@Injectable()
export class ActivationReminderTask {
  private readonly logger = new Logger(ActivationReminderTask.name);

  private readonly activationResendDelayMinutes: number;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    private emailService: EmailService,
  ) {
    this.activationResendDelayMinutes = parseInt(
      process.env.ACTIVATION_RESEND_DELAY_MINUTES ?? '1',
      10,
    );
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleActivationReminders() {
    this.logger.log('Checking for pending admin activations...');

    const thresholdDate = new Date(
      Date.now() - this.activationResendDelayMinutes * 60 * 1000,
    );

    const pendingAdmins = await this.userRepo
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('user.activation_token IS NOT NULL')
      .andWhere('user.activation_sent_at < :threshold', { threshold: thresholdDate })
      .andWhere('role.name = :roleName', { roleName: 'admin' })
      .getMany();

    if (pendingAdmins.length === 0) {
      this.logger.log('No pending admins found.');
      return;
    }

    this.logger.log(
      `Found ${pendingAdmins.length} pending admin(s). Resending activation emails...`,
    );

    for (const admin of pendingAdmins) {
      try {
        const newPassword = this.generateStrongPassword(14);
        const newHashed = await bcrypt.hash(newPassword, 10);
        const newToken = randomBytes(32).toString('hex');

        admin.password = newHashed;
        admin.activation_token = newToken;
        admin.activation_sent_at = new Date();

        await this.userRepo.save(admin);

        await this.emailService.sendAdminCreationEmail(
          admin.email,
          newPassword,
          newToken,
          'fr',
        );

        this.logger.log(`Activation email resent to ${admin.email}`);
      } catch (err) {
        this.logger.error(
          `Failed to resend activation to ${admin.email}`,
          err,
        );
      }
    }
  }

  private generateStrongPassword(length = 12): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}<>?';
    let password = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }
}