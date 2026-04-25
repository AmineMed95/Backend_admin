import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as twilio from 'twilio';

@Injectable()
export class EmailService {
  private twilioClient: twilio.Twilio;

  constructor(private readonly mailerService: MailerService) {
    this.twilioClient = twilio.default(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
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

  async sendClientAccessCode(
    email: string,
    firstName: string,
    accessCode: string,
  ) {
    await this.mailerService.sendMail({
      to: email,
      subject: 'Votre code d\'accès eKYC',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1a56db;">Bienvenue sur l'application eKYC</h2>
          <p>Bonjour <strong>${firstName}</strong>,</p>
          <p>Votre compte a été créé avec succès. Voici votre code d'accès unique pour vous connecter à l'application eKYC :</p>
          
          <div style="
            background: #f3f4f6;
            border: 2px dashed #1a56db;
            border-radius: 8px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
          ">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">Votre code d'accès</p>
            <h1 style="
              margin: 8px 0 0;
              font-size: 36px;
              letter-spacing: 8px;
              color: #1a56db;
              font-family: monospace;
            ">${accessCode}</h1>
          </div>

          <p style="color: #ef4444; font-size: 13px;">
            ⚠️ Ce code est personnel et confidentiel. Ne le partagez avec personne.
          </p>
          <p style="color: #6b7280; font-size: 13px;">
            Si vous n'attendiez pas ce message, veuillez contacter votre conseiller bancaire.
          </p>
        </div>
      `,
    });
  }

  /*
    async sendClientAccessCodeSms(phone: string, firstName: string, accessCode: string) {
    const message = `Bonjour ${firstName}, votre code d'accès eKYC est : ${accessCode}. Ne le partagez avec personne.`;

    await this.twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: phone,
    });
  }*/

  async sendClientAccessCodeSms(phone: string, firstName: string, accessCode: string) {
  // Integrate with your SMS provider (Twilio, Infobip, etc.)
  // Example with a generic HTTP SMS gateway:
  const message = `Bonjour ${firstName}, votre code d'accès eKYC est : ${accessCode}. Ne le partagez avec personne.`;
  
  console.log(`📱 SMS to ${phone}: ${message}`);

  // Example with Twilio (install @twilio/twilio if needed):
  // await this.twilioClient.messages.create({
  //   body: message,
  //   from: process.env.TWILIO_PHONE_NUMBER,
  //   to: phone,
  // });
}
}