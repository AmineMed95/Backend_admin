import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { ResendAccessCodeDto } from './dto/resend-access-code.dto';
import { ClientLoginDto } from './dto/client-login-dto';
import { EmailService } from '../mail/mail.service';
import { randomInt } from 'crypto';
import { t } from '../common/utils/translate.util';
import { SupportedLang } from '../common/utils/lang.util';

const CODE_EXPIRY_HOURS = 48;

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    private emailService: EmailService,
  ) {}

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private generateAccessCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private getExpiryDate(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + CODE_EXPIRY_HOURS);
    return expiry;
  }

  private isCodeExpired(client: Client): boolean {
    if (!client.code_expires_at) return false;
    return new Date() > client.code_expires_at;
  }

  private async generateUniqueCode(): Promise<string> {
    let access_code = '';
    let isUnique = false;
    while (!isUnique) {
      access_code = this.generateAccessCode();
      const exists = await this.clientRepo.findOne({ where: { access_code } });
      if (!exists) isUnique = true;
    }
    return access_code;
  }

  private async sendCode(client: Client, send_via: number): Promise<void> {
    if (send_via === 1) {
      await this.emailService.sendClientAccessCode(client.email, client.first_name, client.access_code, 'fr');
    } else if (send_via === 2) {
      await this.emailService.sendClientAccessCodeSms(client.phone, client.first_name, client.access_code, 'fr');
    }
  }

  // ─── Login with access code ───────────────────────────────────────────────────

  async loginWithAccessCode(dto: ClientLoginDto, lang: SupportedLang) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException(t('clients.email_or_phone_required', lang));
    }

    const client = await this.clientRepo.findOne({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });

    if (!client) {
      throw new UnauthorizedException(t('clients.invalid_code', lang));
    }

    if (client.access_code !== dto.access_code.toUpperCase()) {
      throw new UnauthorizedException(t('clients.invalid_code', lang));
    }

    if (client.is_code_used) {
      throw new BadRequestException(t('clients.code_already_used', lang));
    }

    if (this.isCodeExpired(client)) {
      throw new UnauthorizedException(t('clients.code_expired', lang));
    }

    client.is_code_used = true;
    await this.clientRepo.save(client);

    return {
      message: t('clients.login_success', lang),
      data: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
      },
    };
  }

  // ─── Resend access code ───────────────────────────────────────────────────────

  async resendAccessCode(dto: ResendAccessCodeDto, lang: SupportedLang) {
    const client = await this.clientRepo.findOne({ where: { email: dto.email } });

    if (!client) {
      throw new NotFoundException(t('clients.client_not_found', lang));
    }

    if (client.is_code_used) {
      throw new BadRequestException(t('clients.code_already_used', lang));
    }

    if (dto.send_via === 2 && !client.phone) {
      throw new BadRequestException(t('clients.no_phone_for_sms', lang));
    }

    client.access_code = await this.generateUniqueCode();
    client.code_expires_at = this.getExpiryDate();
    const updated = await this.clientRepo.save(client);

    await this.sendCode(updated, dto.send_via);

    return {
      message: dto.send_via === 1
        ? t('clients.new_code_email', lang)
        : t('clients.new_code_sms', lang),
      data: {
        id: updated.id,
        first_name: updated.first_name,
        last_name: updated.last_name,
        email: updated.email,
        send_via: dto.send_via,
        updated_at: updated.updated_at,
      },
    };
  }

  // ─── Create client ────────────────────────────────────────────────────────────

  async createClient(dto: CreateClientDto, agentId: number, lang: SupportedLang) {
    const existing = await this.clientRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(t('clients.email_exists', lang));
    }

    if (dto.send_via === 2 && !dto.phone) {
      throw new BadRequestException(t('clients.phone_required_sms', lang));
    }

    const access_code = await this.generateUniqueCode();

    const client = this.clientRepo.create({ ...dto, access_code, created_by: agentId });
    client.code_expires_at = this.getExpiryDate();

    const saved = await this.clientRepo.save(client);
    await this.sendCode(saved, dto.send_via);

    return {
      message: dto.send_via === 1
        ? t('clients.created_email', lang)
        : t('clients.created_sms', lang),
      data: {
        id: saved.id,
        first_name: saved.first_name,
        last_name: saved.last_name,
        email: saved.email,
        phone: saved.phone,
        access_code: saved.access_code,
        send_via: dto.send_via,
        created_at: saved.created_at,
      },
    };
  }

  // ─── Get clients ──────────────────────────────────────────────────────────────

  async getClients(agentId: number) {
    const clients = await this.clientRepo
      .createQueryBuilder('client')
      .leftJoinAndSelect(
        'client.kycRecord',
        'kyc',
        'kyc.deleted_at IS NOT NULL OR kyc.deleted_at IS NULL',
      )
      .withDeleted()
      .where('client.created_by = :agentId', { agentId })
      .orderBy('client.created_at', 'DESC')
      .select([
        'client.id',
        'client.first_name',
        'client.last_name',
        'client.email',
        'client.phone',
        'client.access_code',
        'client.is_code_used',
        'client.created_at',
        'client.created_by',
        'kyc.id',
        'kyc.status',
        'kyc.deleted_at',
        'kyc.cinData',
        'kyc.cinImageUrl',
        'kyc.selfieImageUrl',
        'kyc.facialMatchingScore',
        'kyc.createdAt',
      ])
      .getMany();

    return clients.map((client) => {
      const kyc = client.kycRecord ?? null;
      const kycWithStatus = kyc
        ? { ...kyc, status: kyc.deletedAt ? 'non_valide' : kyc.status }
        : null;
      return { ...client, has_kyc: !!kyc, kyc: kycWithStatus };
    });
  }
}
