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
import { randomBytes } from 'crypto';

// Access code validity duration in hours
const CODE_EXPIRY_HOURS = 48;

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    private emailService: EmailService,
  ) {}

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private generateAccessCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private getExpiryDate(): Date {
    const expiry = new Date();
    expiry.setHours(expiry.getHours() + CODE_EXPIRY_HOURS);
    return expiry;
  }

  private isCodeExpired(client: Client): boolean {
    if (!client.code_expires_at) return false; // no expiry set = never expires (legacy)
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
      await this.emailService.sendClientAccessCode(
        client.email,
        client.first_name,
        client.access_code,
      );
    } else if (send_via === 2) {
      await this.emailService.sendClientAccessCodeSms(
        client.phone,
        client.first_name,
        client.access_code,
      );
    }
  }

  // ─── US4.1 — Login with access code ─────────────────────────────────────────

  async loginWithAccessCode(dto: ClientLoginDto) {
    if (!dto.email && !dto.phone) {
      throw new BadRequestException('Email ou numéro de téléphone requis');
    }

    // Find client by email or phone
    const client = await this.clientRepo.findOne({
      where: dto.email ? { email: dto.email } : { phone: dto.phone },
    });

    // Generic error — do not reveal if email/phone exists
    if (!client) {
      throw new UnauthorizedException("Code d'accès invalide ou expiré");
    }

    // Check code match
    if (client.access_code !== dto.access_code.toUpperCase()) {
      throw new UnauthorizedException("Code d'accès invalide ou expiré");
    }

    // Check if already used
    if (client.is_code_used) {
      throw new BadRequestException(
        'Ce code a déjà été utilisé. Le processus eKYC est déjà complété.',
      );
    }

    // Check expiry
    if (this.isCodeExpired(client)) {
      throw new UnauthorizedException(
        "Code d'accès expiré. Veuillez demander un nouveau code.",
      );
    }

    // Mark code as used
    client.is_code_used = true;
    await this.clientRepo.save(client);

    return {
      message: 'Connexion réussie. Vous pouvez commencer le processus eKYC.',
      data: {
        id: client.id,
        first_name: client.first_name,
        last_name: client.last_name,
        email: client.email,
        phone: client.phone,
      },
    };
  }

  // ─── US4.2 — Resend access code ──────────────────────────────────────────────

  async resendAccessCode(dto: ResendAccessCodeDto) {
    const client = await this.clientRepo.findOne({
      where: { email: dto.email },
    });

    if (!client) {
      throw new NotFoundException('Aucun client trouvé avec cet email');
    }

    if (client.is_code_used) {
      throw new BadRequestException(
        'Le code a déjà été utilisé. Le processus eKYC est déjà complété.',
      );
    }

    if (dto.send_via === 2 && !client.phone) {
      throw new BadRequestException(
        "Aucun numéro de téléphone associé à ce client pour l'envoi SMS",
      );
    }

    // Generate new code + reset expiry
    client.access_code = await this.generateUniqueCode();
    client.code_expires_at = this.getExpiryDate();
    const updated = await this.clientRepo.save(client);

    await this.sendCode(updated, dto.send_via);

    return {
      message:
        dto.send_via === 1
          ? "Nouveau code d'accès envoyé par email"
          : "Nouveau code d'accès envoyé par SMS",
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

  // ─── Create client ───────────────────────────────────────────────────────────

  async createClient(dto: CreateClientDto, agentId: number) {
    const existing = await this.clientRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    if (dto.send_via === 2 && !dto.phone) {
      throw new BadRequestException('Phone number is required for SMS sending');
    }

    const access_code = await this.generateUniqueCode();

    const client = this.clientRepo.create({
      ...dto,
      access_code,
      created_by: agentId,
    });

    // Assign explicitly after create() so TypeORM never drops it
    client.code_expires_at = this.getExpiryDate();

    const saved = await this.clientRepo.save(client);
    await this.sendCode(saved, dto.send_via);

    return {
      message:
        dto.send_via === 1
          ? "Client créé et code d'accès envoyé par email"
          : "Client créé et code d'accès envoyé par SMS",
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

  // ─── Get clients ─────────────────────────────────────────────────────────────
  async getClients(agentId: number) {
    const clients = await this.clientRepo
      .createQueryBuilder('client')
    .leftJoin(
        'client.kycRecord',
        'kyc',
        'kyc.status = :status',
        { status: 'en_attente' },
      )
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
      ])
          .addSelect(
          'CASE WHEN kyc.id IS NOT NULL THEN true ELSE false END',
          'has_pending_kyc', 
        )
      .getRawAndEntities();

    return clients.entities.map((client, i) => ({
      ...client,
      has_kyc:
        clients.raw[i]?.has_pending_kyc === true ||
        clients.raw[i]?.has_pending_kyc === 'true',
    }));
  }
}