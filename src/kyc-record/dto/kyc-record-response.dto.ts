export class KycRecordResponseDto {
  id: number;
  status: string;
  facialMatchingScore: number | null;
  cinData: object | null;
  createdAt: Date;
  client: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
}