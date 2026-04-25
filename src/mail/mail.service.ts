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

  async sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await this.mailerService.sendMail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
    html: `
      <h2>Réinitialisation du mot de passe</h2>
      <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <a href="${resetLink}" style="
        display: inline-block;
        padding: 12px 24px;
        background: #3b82f6;
        color: white;
        border-radius: 6px;
        text-decoration: none;
        font-weight: bold;
      ">
        Réinitialiser mon mot de passe
      </a>
      <p>Ce lien est valable pendant <strong>1 heure</strong>.</p>
      <p>Si vous n'avez pas fait cette demande, ignorez cet email.</p>
    `,
  });
}
}