import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class EmailService {
  constructor(private mailerService: MailerService) {}

  async sendAdminCreationEmail(email: string, password: string, token: string) {
    const link = `http://localhost:3000/auth/activate?token=${token}`;

    await this.mailerService.sendMail({
      to: email,
      subject: 'Admin Account Created',
      html: `
        <h2>Welcome</h2>
        <p>Email: ${email}</p>
        <p>Password: ${password}</p>
        <a href="${link}">Activate Account</a>
      `,
    });
  }
}