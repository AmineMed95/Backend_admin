import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { UserStatus } from '../users/userstatus.entity';
import { EmailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';
import { t } from '../common/utils/translate.util';
import { SupportedLang } from '../common/utils/lang.util';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(UserStatus)
    private readonly statusRepo: Repository<UserStatus>,
    private emailService: EmailService,
  ) {}

  async login(email: string, password: string, lang: SupportedLang) {
    const user = await this.usersService.findByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException(t('auth.invalid_credentials', lang));
    }

    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(user.role.name)) {
      throw new UnauthorizedException(t('auth.access_denied', lang));
    }

    if (user.role.name === 'admin' && user.activation_token !== null) {
      throw new UnauthorizedException(t('auth.account_not_activated', lang));
    }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        role: user.role.name,
        email: user.email,
      }),
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role.name,
        phone: user.phone,
        organisation: user.organisation
          ? {
              id: user.organisation.id,
              name_organisation: user.organisation.name_organisation,
              logo_organisation: user.organisation.logo_organisation,
            }
          : null,
      },
    };
  }

  async logout(_user: any, lang: SupportedLang) {
    return { message: t('auth.logged_out', lang) };
  }

  async activateAccount(token: string, lang: SupportedLang) {
    const user = await this.userRepo.findOne({ where: { activation_token: token } });
    if (!user) {
      throw new BadRequestException(t('auth.invalid_token', lang));
    }

    const activeStatus = await this.statusRepo.findOne({ where: { code: 'actif' } });
    if (!activeStatus) {
      throw new BadRequestException(t('auth.status_not_found', lang));
    }

    user.status = activeStatus;
    user.activation_token = null;
    await this.userRepo.save(user);

    return { message: t('auth.account_activated', lang) };
  }

  async forgotPassword(email: string, lang: SupportedLang) {
    const user = await this.userRepo.findOne({ where: { email }, relations: ['role'] });

    if (!user) {
      throw new BadRequestException(t('auth.email_not_found', lang));
    }

    const token = randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    user.reset_password_token = token;
    user.reset_password_expires = expires;
    await this.userRepo.save(user);

    await this.emailService.sendPasswordResetEmail(user.email, token, lang);

    return { message: t('auth.reset_email_sent', lang) };
  }

  async resetPassword(
    token: string,
    newPassword: string,
    confirmPassword: string,
    lang: SupportedLang,
  ) {
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(t('auth.passwords_dont_match', lang));
    }

    const user = await this.userRepo.findOne({ where: { reset_password_token: token } });

    if (!user) {
      throw new BadRequestException(t('auth.invalid_link', lang));
    }

    if (!user.reset_password_expires || user.reset_password_expires < new Date()) {
      throw new BadRequestException(t('auth.link_expired', lang));
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.reset_password_token = null;
    user.reset_password_expires = null;
    await this.userRepo.save(user);

    return { message: t('auth.password_updated', lang) };
  }
}
