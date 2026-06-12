import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import * as fs from 'fs';
import * as path from 'path';
import { t } from '../common/utils/translate.util';
import { SupportedLang } from '../common/utils/lang.util';
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

  // ─── Template helpers ─────────────────────────────────────────────────────────

  private loadTemplate(name: string): string {
    return fs.readFileSync(path.join(__dirname, 'templates', name), 'utf-8');
  }

  private render(template: string, context: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '');
  }

  // ─── Admin activation email ───────────────────────────────────────────────────

  async sendAdminCreationEmail(
    email: string,
    password: string,
    token: string,
    lang: SupportedLang,
  ) {
    const link = `http://localhost:5173/?token=${token}`;
    const dir  = lang === 'ar' ? 'rtl' : 'ltr';

    const html = this.render(this.loadTemplate('activation.html'), {
      lang,
      dir,
      greeting:        t('mail.activation.greeting',        lang),
      created:         t('mail.activation.created',         lang),
      email_label:     t('mail.activation.email_label',     lang),
      password_label:  t('mail.activation.password_label',  lang),
      cta_text:        t('mail.activation.cta_text',        lang),
      cta_label:       t('mail.activation.cta_label',       lang),
      security_notice: t('mail.activation.security_notice', lang),
      ignore:          t('mail.activation.ignore',          lang),
      email,
      password,
      link,
    });

    await this.mailerService.sendMail({
      to:      email,
      subject: t('mail.activation.subject', lang),
      html,
    });
  }

  // ─── Password reset email ─────────────────────────────────────────────────────

  async sendPasswordResetEmail(email: string, token: string, lang: SupportedLang) {
    const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
    const dir       = lang === 'ar' ? 'rtl' : 'ltr';

    const html = this.render(this.loadTemplate('reset-password.html'), {
      lang,
      dir,
      title:      t('mail.reset.title',     lang),
      intro:      t('mail.reset.intro',     lang),
      cta_text:   t('mail.reset.cta_text',  lang),
      cta_label:  t('mail.reset.cta_label', lang),
      validity:   t('mail.reset.validity',  lang),
      reset_link: resetLink,
    });

    await this.mailerService.sendMail({
      to:      email,
      subject: t('mail.reset.subject', lang),
      html,
    });
  }

  // ─── Client eKYC access code email ───────────────────────────────────────────

  async sendClientAccessCode(
    email: string,
    firstName: string,
    accessCode: string,
    lang: SupportedLang = 'fr',
  ) {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';

    const html = this.render(this.loadTemplate('access-code.html'), {
      lang,
      dir,
      greeting:    t('mail.access_code.greeting', lang),
      intro:       t('mail.access_code.intro',    lang),
      label:       t('mail.access_code.label',    lang),
      warning:     t('mail.access_code.warning',  lang),
      contact:     t('mail.access_code.contact',  lang),
      first_name:  firstName,
      access_code: accessCode,
    });

    await this.mailerService.sendMail({
      to:      email,
      subject: t('mail.access_code.subject', lang),
      html,
    });
  }

  // ─── Client eKYC access code SMS ─────────────────────────────────────────────

  async sendClientAccessCodeSms(
    phone: string,
    firstName: string,
    accessCode: string,
    lang: SupportedLang = 'fr',
  ) {
    const greeting = t('mail.access_code.greeting', lang);
    const warning  = t('mail.access_code.warning',  lang);
    const message  = `${greeting} ${firstName}, eKYC: ${accessCode}. ${warning}`;

    console.log(`📱 SMS to ${phone}: ${message}`);
    // await this.twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: phone,
    // });
  }
}
