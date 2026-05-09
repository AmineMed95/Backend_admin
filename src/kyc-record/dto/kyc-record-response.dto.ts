// src/kyc-record/dto/kyc-record-response.dto.ts
import { CinData } from '../kyc-record.entity';

export class KycRecordResponseDto {
  id: number;
  status: string;

  // OCR extracted data from the CIN document
  cinData: CinData | null;

  // Scanned CIN document image URL
  cinImageUrl: string | null;

  // Client selfie image URL
  selfieImageUrl: string | null;

  // Face matching score between selfie and CIN photo
  facialMatchingScore: number | null;

  createdAt: Date;

  client: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}