import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { Twilio } from 'twilio';

@Injectable()
export class EmailService {
  private twilioClient: Twilio;

  constructor(private readonly mailerService: MailerService) {
    this.twilioClient = new Twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
    );
  }
  async sendAdminCreationEmail(email: string, password: string, token: string) {
    const link = `http://localhost:5173/?token=${token}`;

    await this.mailerService.sendMail({
    to: email,
    subject: 'Activation de votre compte administrateur',
    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 24px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        background-color: #ffffff;
      ">
        <h2 style="
          color: #111827;
          margin-bottom: 16px;
        ">
          Bienvenue 👋
        </h2>

        <p style="color: #374151; line-height: 1.6;">
          Votre compte administrateur a été créé avec succès.
        </p>

        <div style="
          margin: 24px 0;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
        ">
          <p style="margin: 0 0 8px 0;">
            <strong>Email :</strong> ${email}
          </p>

          <p style="margin: 0;">
            <strong>Mot de passe :</strong> ${password}
          </p>
        </div>

        <p style="color: #374151; line-height: 1.6;">
          Cliquez sur le bouton ci-dessous pour activer votre compte :
        </p>

        <a
          href="${link}"
          style="
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            margin-top: 12px;
          "
        >
          Activer mon compte
        </a>

        <p style="
          margin-top: 24px;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.5;
        ">
          Pour des raisons de sécurité, nous vous recommandons de modifier votre mot de passe après votre première connexion.
        </p>

        <p style="
          margin-top: 16px;
          color: #9ca3af;
          font-size: 13px;
        ">
          Si vous n'êtes pas à l'origine de cette création de compte, veuillez ignorer cet email.
        </p>
      </div>
    `,
  });
  }

  async sendPasswordResetEmail(email: string, token: string) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

  await this.mailerService.sendMail({
    to: email,
    subject: 'Réinitialisation de votre mot de passe',
      html: `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; font-family: Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

              <tr>
                <td style="padding: 0 0 16px 0;">
                  <h2 style="margin:0; color:#111827;">Réinitialisation du mot de passe</h2>
                </td>
              </tr>

              <tr>
                <td style="padding: 0 0 12px 0; color:#374151;">
                  Vous avez demandé la réinitialisation de votre mot de passe.
                </td>
              </tr>

              <tr>
                <td style="padding: 0 0 24px 0; color:#374151;">
                  Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
                </td>
              </tr>

              <!-- ✅ VML button for Outlook + regular <a> for everything else -->
              <tr>
                <td align="center" style="padding: 0 0 24px 0;">
                  <!--[if mso]>
                  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml"
                              xmlns:w="urn:schemas-microsoft-com:office:word"
                              href="${resetLink}"
                              style="height:46px; v-text-anchor:middle; width:260px;"
                              arcsize="13%"
                              fillcolor="#3b82f6"
                              stroke="f">
                    <w:anchorlock/>
                    <center style="color:#ffffff; font-family:Arial,sans-serif; font-size:15px; font-weight:bold;">
                      Réinitialiser mon mot de passe
                    </center>
                  </v:roundrect>
                  <![endif]-->
                  <!--[if !mso]><!-->
                  <a href="${resetLink}"
                    target="_blank"
                    style="
                      display: inline-block;
                      padding: 13px 30px;
                      background-color: #3b82f6;
                      color: #ffffff !important;
                      text-decoration: none;
                      font-family: Arial, sans-serif;
                      font-size: 15px;
                      font-weight: bold;
                      border-radius: 6px;
                      mso-hide: all;
                    ">
                    Réinitialiser mon mot de passe
                  </a>
                  <!--<![endif]-->
                </td>
              </tr>

              <tr>
                <td style="padding: 0 0 12px 0; color:#374151;">
                  Ce lien est valable pendant <strong>1 heure</strong>.
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
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