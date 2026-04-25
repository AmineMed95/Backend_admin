import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client)
    private clientRepo: Repository<Client>,
  ) {}

  private generateAccessCode(): string {
    // Generates a unique 8-char uppercase alphanumeric code e.g. "A3F9K2MX"
    return randomBytes(4).toString('hex').toUpperCase();
  }

 
  async createClient(dto: CreateClientDto, agentId: number) {
    const existing = await this.clientRepo.findOne({
        where: { email: dto.email },
    });
    if (existing) {
        throw new ConflictException('Email already exists');
    }

    // 👇 Initialize with empty string to avoid "used before assigned" error
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

    return {
        message: 'Client créé avec succès',
        data: {
        id: saved.id,
        first_name: saved.first_name,
        last_name: saved.last_name,
        email: saved.email,
        phone: saved.phone,
        access_code: saved.access_code,
        created_at: saved.created_at,
        },
    };
    }

  async getClients(agentId: number) {
    return this.clientRepo.find({
      where: { created_by: agentId },
      order: { created_at: 'DESC' },
      relations: ['role'],           
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        access_code: true,
        is_code_used: true,
        created_at: true,
        role: {
          id: true,
          name: true,
        },
      },
    });
  }
}