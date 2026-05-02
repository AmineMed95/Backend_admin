// src/kyc-record/kyc-record.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycRecord } from './kyc-record.entity';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { KycRecordResponseDto } from './dto/kyc-record-response.dto';

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

 private toDto(record: KycRecord): KycRecordResponseDto {
  return {
    id: record.id,
    status: record.status,
    facialMatchingScore: record.facialMatchingScore ?? null,
    cinData: record.cinData ?? null,
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