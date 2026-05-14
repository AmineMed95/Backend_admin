// src/kyc-record/kyc-record.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Client } from '../clients/client.entity';

export enum KycStatus {
  VALID = 'valide',
  PENDING = 'en_attente',
  INVALID = 'non_valide',
}

export interface CinData {
  cin: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  lieu: string;
  address?: string;
}

@Entity('kyc_records')
export class KycRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Client, (client) => client.kycRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @Column({
    type: 'varchar',
    enum: KycStatus,
    default: KycStatus.PENDING,
  })
  status: KycStatus;

  @Column({ type: 'float', nullable: true, name: 'facial_matching_score' })
  facialMatchingScore: number;

  @Column({ type: 'jsonb', nullable: true, name: 'cin_data' })
  cinData: CinData;

  // Path or URL of the scanned CIN document image
  @Column({ type: 'varchar', nullable: true, name: 'cin_image_url' })
  cinImageUrl: string;

  // Path or URL of the client selfie image
  @Column({ type: 'varchar', nullable: true, name: 'selfie_image_url' })
  selfieImageUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}