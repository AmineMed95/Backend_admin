// src/kyc-record/dto/update-kyc-status.dto.ts
import { IsEnum } from 'class-validator';
import { KycStatus } from '../kyc-record.entity';

export class UpdateKycStatusDto {
  @IsEnum([KycStatus.VALID, KycStatus.INVALID], {
    message: "status must be either 'valide' or 'non_valide'",
  })
  status: KycStatus.VALID | KycStatus.INVALID;
}