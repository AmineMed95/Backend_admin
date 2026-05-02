import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { EmailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
    private emailService: EmailService, 
  ) {}

  private generateAccessCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }
  
  async createClient(dto: CreateClientDto, agentId: number) {
  const existing = await this.clientRepo.findOne({
    where: { email: dto.email },
  });
  if (existing) {
    throw new ConflictException('Email already exists');
  }
  // Validate SMS requires phone
  if (dto.send_via === 2 && !dto.phone) {
    throw new BadRequestException('Phone number is required for SMS sending');
  }

  let access_code = '';
  let isUnique = false;
  while (!isUnique) {
    access_code = this.generateAccessCode();
    const exists = await this.clientRepo.findOne({ where: { access_code } });
    if (!exists) isUnique = true;
  }

  const client = this.clientRepo.create({
    ...dto,
    access_code,
    created_by: agentId,
  });

  const saved = await this.clientRepo.save(client);

  //  Send via email or SMS based on send_via
  if (dto.send_via === 1) {
    await this.emailService.sendClientAccessCode(
      saved.email,
      saved.first_name,
      saved.access_code,
    );
  } else if (dto.send_via === 2) {
    await this.emailService.sendClientAccessCodeSms(
      saved.phone,
      saved.first_name,
      saved.access_code,
    );
  }

  return {
    message: dto.send_via === 1
      ? 'Client créé et code d\'accès envoyé par email'
      : 'Client créé et code d\'accès envoyé par SMS',
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

  async getClients(agentId: number) {
    return this.clientRepo.find({
      where: { created_by: agentId },
      order: { created_at: 'DESC' },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        access_code: true,
        is_code_used: true,
        created_at: true,
        created_by: true,
      },
    });
  }
}