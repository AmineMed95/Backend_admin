import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycRecord, KycStatus } from './kyc-record.entity';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { KycRecordResponseDto } from './dto/kyc-record-response.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { ClientsService } from '../clients/clients.service';

@Injectable()
export class KycRecordService {
  constructor(
    @InjectRepository(KycRecord)
    private readonly kycRepo: Repository<KycRecord>,
    private readonly clientService: ClientsService,
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
      .withDeleted()
      .orderBy('kyc.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (status) {
      if (status === KycStatus.INVALID) {
        qb.andWhere('(kyc.status = :status OR kyc.deleted_at IS NOT NULL)', { status });
      } else {
        qb.andWhere('kyc.status = :status AND kyc.deleted_at IS NULL', { status });
      }
    }

    const [records, total] = await qb.getManyAndCount();

    return {
      data: records.map((r) => this.toDto(r)),
      total,
      page,
      limit,
    };
  }

  async findOneByClientId(clientId: number): Promise<KycRecordResponseDto> {
    const record = await this.kycRepo.findOne({
      where: { client: { id: clientId } },
      relations: ['client'],
      withDeleted: true,
    });

    if (!record) {
      throw new NotFoundException(`KYC record not found for client ${clientId}`);
    }

    return this.toDto(record);
  }

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

    if (record.status !== KycStatus.PENDING) {
      throw new BadRequestException(
        `Ce dossier a déjà été traité (statut actuel : ${record.status})`,
      );
    }

    // ✅ Guard: client relation must be loaded
    if (!record.client) {
      throw new NotFoundException(`Client not found for KYC record ${kycId}`);
    }

    if (record.client.created_by !== agentId) {
      throw new NotFoundException(`KYC record not found`);
    }

    record.status = dto.status;
    const updated = await this.kycRepo.save(record);

    if (dto.status === KycStatus.INVALID) {
      // ✅ Guard: client must still be present after save
      if (!updated.client) {
        throw new NotFoundException(`Client not found after KYC update`);
      }

      await this.clientService.resendAccessCode({
        email: updated.client.email,
        send_via: 1,
      });

      await this.kycRepo.softRemove(updated);
    }

    const message =
      dto.status === KycStatus.VALID
        ? 'Dossier validé — identité acceptée'
        : 'Dossier rejeté — nouveau code envoyé';

    return {
      message,
      data: this.toDto(updated),
    };
  }

  async restore(kycId: number): Promise<void> {
    await this.kycRepo.restore(kycId);
  }

  // ── DTO mapper ───────────────────────────────────────────────────────────
  private toDto(record: KycRecord): KycRecordResponseDto {
    if (!record.client) {
      throw new NotFoundException(`Client relation missing on KYC record ${record.id}`);
    }

    const status = record.deletedAt ? KycStatus.INVALID : record.status;

    return {
      id: record.id as number,                   // ✅ cast: PrimaryGeneratedColumn is number after save
      status: status as KycStatus,               // ✅ cast: always defined here
      cinData: record.cinData ?? null,
      cinImageUrl: record.cinImageUrl ?? null,
      selfieImageUrl: record.selfieImageUrl ?? null,
      facialMatchingScore: record.facialMatchingScore ?? null,
      createdAt: record.createdAt as Date,        // ✅ cast: always set by TypeORM
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