import { KycStatus, CinData } from '../kyc-record.entity';

export class KycRecordResponseDto {
  id: number | undefined;
  status: KycStatus | undefined;          // use the enum, not plain string

  cinData: CinData | null | undefined;
  cinImageUrl: string | null | undefined;
  selfieImageUrl: string | null | undefined;
  facialMatchingScore!: number | null;

  createdAt: Date | undefined;

  client!: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}