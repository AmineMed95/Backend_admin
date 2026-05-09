// src/kyc-record/kyc-record.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycRecord, KycStatus } from './kyc-record.entity';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { KycRecordResponseDto } from './dto/kyc-record-response.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';

@Injectable()
export class KycRecordService {
  constructor(
    @InjectRepository(KycRecord)
    private readonly kycRepo: Repository<KycRecord>,
  ) {}

  async findAllByAdmin(
    adminId: number,
    filters: KycFilterDto,
  ): Promise<{
    data: KycRecordResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { status, page = 1, limit = 10 } = filters;

    const qb = this.kycRepo
      .createQueryBuilder('kyc')
      .leftJoinAndSelect('kyc.client', 'client')
      .where('client.created_by = :adminId', { adminId })
      .orderBy('kyc.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      qb.andWhere('kyc.status = :status', { status });
    }

    const [records, total] = await qb.getManyAndCount();

    return {
      data: records.map((r) => this.toDto(r)),
      total,
      page,
      limit,
    };
  }

  // US8.2 — Get full client dossier by clientId
  async findOneByClientId(clientId: number): Promise<KycRecordResponseDto> {
    const record = await this.kycRepo.findOne({
      where: { client: { id: clientId } },
      relations: ['client'],
    });

    if (!record) {
      throw new NotFoundException(`KYC record not found for client ${clientId}`);
    }

    return this.toDto(record);
  }

  // US8.3 — Validate or reject a KYC dossier
  async updateStatus(
    kycId: number,
    dto: UpdateKycStatusDto,
    agentId: number,
  ): Promise<{ message: string; data: KycRecordResponseDto }> {
    const record = await this.kycRepo.findOne({
      where: { id: kycId },
      relations: ['client'],
    });

    if (!record) {
      throw new NotFoundException(`KYC record not found`);
    }

    // Only pending dossiers can be reviewed
    if (record.status !== KycStatus.PENDING) {
      throw new BadRequestException(
        `Ce dossier a déjà été traité (statut actuel : ${record.status})`,
      );
    }

    // Verify the agent owns this client (avoid cross-agent access)
    if (record.client.created_by !== agentId) {
      throw new NotFoundException(`KYC record not found`);
    }

    record.status = dto.status;
    const updated = await this.kycRepo.save(record);

    const message =
      dto.status === KycStatus.VALID
        ? 'Dossier validé — identité acceptée'
        : 'Dossier rejeté — identité refusée';

    return { message, data: this.toDto(updated) };
  }

  private toDto(record: KycRecord): KycRecordResponseDto {
    return {
      id: record.id,
      status: record.status,
      cinData: record.cinData ?? null,
      cinImageUrl: record.cinImageUrl ?? null,
      selfieImageUrl: record.selfieImageUrl ?? null,
      facialMatchingScore: record.facialMatchingScore ?? null,
      createdAt: record.createdAt,
      client: {
        id: record.client.id,
        firstName: record.client.first_name,
        lastName: record.client.last_name,
        email: record.client.email,
        phone: record.client.phone,
      },
    };
  }
}