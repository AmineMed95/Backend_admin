import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from './user.entity';
import { Role } from '../roles/role.entity';
import { randomBytes } from 'crypto';
import { UserStatus } from './userstatus.entity';
import { EmailService } from '../mail/mail.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { OrganisationsService } from 'src/organisation/organisations.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Organisation } from '../organisation/organisation.entity';
import { t } from '../common/utils/translate.util';
import { SupportedLang } from '../common/utils/lang.util';

@Injectable()
export class UsersService {
  private readonly activationResendDelayHours: number;

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,

    @InjectRepository(Role)
    private roleRepo: Repository<Role>,

    @InjectRepository(UserStatus)
    private statusRepo: Repository<UserStatus>,

    private emailService: EmailService,

    private readonly organisationsService: OrganisationsService,
  ) {
    this.activationResendDelayHours = parseInt(
      process.env.ACTIVATION_RESEND_DELAY_HOURS ?? '48',
      10,
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  findByEmail(email: string) {
    return this.userRepo.findOne({
      where: { email },
      relations: ['role', 'organisation'],
      select: {
        id: true,
        email: true,
        password: true,
        activation_token: true,
        first_name: true,
        last_name: true,
        phone: true,
        role: { id: true, name: true },
        organisation: {
          id: true,
          name_organisation: true,
          logo_organisation: true,
        },
      },
    });
  }

  private generateStrongPassword(length = 12): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}?';
    let password = '';
    const bytes = randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    return password;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // createAdmin
  // ─────────────────────────────────────────────────────────────────────────────

  async createAdmin(dto: CreateAdminDto, lang: SupportedLang) {
    const organisation = await this.organisationsService.findOne(dto.organisation_id);

    const orgHasAdmin = await this.userRepo.findOne({
      where: { organisation_id: dto.organisation_id, role: { name: 'admin' } },
      relations: ['role'],
    });
    if (orgHasAdmin) {
      throw new ConflictException(t('users.org_has_admin', lang));
    }

    const emailExists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (emailExists) {
      throw new ConflictException(t('users.email_exists', lang));
    }

    if (dto.phone) {
      const phoneExists = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (phoneExists) {
        throw new ConflictException(t('users.phone_exists', lang));
      }
    }

    const role = await this.roleRepo.findOne({ where: { name: 'admin' } });
    if (!role) throw new NotFoundException(t('users.role_not_found', lang));

    const status = await this.statusRepo.findOne({ where: { code: 'en_attend' } });
    if (!status) throw new NotFoundException(t('users.status_not_found', lang));

    const password = this.generateStrongPassword(14);
    const hashed = await bcrypt.hash(password, 10);
    const token = randomBytes(32).toString('hex');

    const admin = this.userRepo.create({
      first_name:         dto.first_name,
      last_name:          dto.last_name,
      email:              dto.email,
      phone:              dto.phone,
      password:           hashed,
      organisation_id:    organisation.id,
      role_id:            role.id,
      status,
      activation_token:   token,
      activation_sent_at: new Date(),
    });

    const saved = await this.userRepo.save(admin);
    const user = Array.isArray(saved) ? saved[0] : saved;

    await this.emailService.sendAdminCreationEmail(user.email, password, token, lang);

    return {
      message:      t('users.admin_created', lang),
      email:        user.email,
      organisation: organisation.name_organisation,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // getListAdmin
  // ─────────────────────────────────────────────────────────────────────────────

  async getListAdmin() {
    return this.userRepo.find({
      relations: ['role', 'status', 'organisation'],
      where: { role: { name: 'admin' } },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        created_at: true,
        status: { id: true, code: true, label: true },
        role: { id: true, name: true },
        organisation: {
          id: true,
          name_organisation: true,
          adresse_organisation: true,
          phone_organisation: true,
          logo_organisation: true,
        },
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // updateInactiveAdmin
  // ─────────────────────────────────────────────────────────────────────────────

  async updateInactiveAdmin(id: number, dto: UpdateAdminDto, lang: SupportedLang) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status', 'organisation'],
    });

    if (!admin) throw new NotFoundException(t('users.admin_not_found', lang));
    if (admin.role?.name !== 'admin') throw new ForbiddenException(t('users.not_admin', lang));

    if (dto.email && dto.email !== admin.email) {
      const emailExists = await this.userRepo.findOne({ where: { email: dto.email } });
      if (emailExists) throw new ConflictException(t('users.email_exists', lang));
    }

    if (dto.phone && dto.phone !== admin.phone) {
      const phoneExists = await this.userRepo.findOne({ where: { phone: dto.phone } });
      if (phoneExists) throw new ConflictException(t('users.phone_exists', lang));
    }

    if (dto.organisation_id !== undefined) {
      await this.organisationsService.findOne(dto.organisation_id);
      admin.organisation = { id: dto.organisation_id } as Organisation;
    }

    const { organisation_id, ...scalarFields } = dto;
    Object.assign(admin, scalarFields);

    const updated = await this.userRepo.save(admin);
    const result = await this.userRepo.findOne({
      where: { id: updated.id },
      relations: ['role', 'status', 'organisation'],
    });

    return { message: t('users.admin_updated', lang), data: result };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // deleteInactiveAdmin
  // ─────────────────────────────────────────────────────────────────────────────

  async deleteInactiveAdmin(id: number, lang: SupportedLang) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status'],
    });

    if (!admin) throw new NotFoundException(t('users.admin_not_found', lang));
    if (admin.role?.name !== 'admin') throw new ForbiddenException(t('users.not_admin', lang));
    if (admin.activation_token === null) {
      throw new ForbiddenException(t('users.cannot_delete_active', lang));
    }

    await this.userRepo.remove(admin);
    return { message: t('users.admin_deleted', lang) };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // resendActivationEmail
  // ─────────────────────────────────────────────────────────────────────────────

  async resendActivationEmail(id: number, lang: SupportedLang) {
    const admin = await this.userRepo.findOne({
      where: { id },
      relations: ['role', 'status'],
    });

    if (!admin) throw new NotFoundException(t('users.admin_not_found', lang));
    if (admin.role?.name !== 'admin') throw new ForbiddenException(t('users.not_admin', lang));
    if (admin.activation_token === null) {
      throw new ForbiddenException(t('users.already_activated', lang));
    }

    if (admin.activation_sent_at) {
      const hoursSince =
        (Date.now() - new Date(admin.activation_sent_at).getTime()) / (1000 * 60 * 60);

      if (hoursSince < this.activationResendDelayHours) {
        const hoursRemaining = Math.ceil(this.activationResendDelayHours - hoursSince);
        throw new BadRequestException(
          t('users.resend_wait', lang, { hours: hoursRemaining }),
        );
      }
    }

    const newPassword = this.generateStrongPassword(14);
    const newHashed = await bcrypt.hash(newPassword, 10);
    const newToken = randomBytes(32).toString('hex');

    admin.password = newHashed;
    admin.activation_token = newToken;
    admin.activation_sent_at = new Date();

    await this.userRepo.save(admin);
    await this.emailService.sendAdminCreationEmail(admin.email, newPassword, newToken, lang);

    return { message: t('users.activation_resent', lang), email: admin.email };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // changePassword
  // ─────────────────────────────────────────────────────────────────────────────

  async changePassword(userId: number, dto: ChangePasswordDto, lang: SupportedLang) {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user) throw new NotFoundException(t('users.user_not_found', lang));

    const isMatch = await bcrypt.compare(dto.current_password, user.password);
    if (!isMatch) throw new UnauthorizedException(t('users.wrong_password', lang));

    const isSame = await bcrypt.compare(dto.new_password, user.password);
    if (isSame) throw new BadRequestException(t('users.same_password', lang));

    user.password = await bcrypt.hash(dto.new_password, 10);
    await this.userRepo.save(user);

    return { message: t('users.password_changed', lang) };
  }
}