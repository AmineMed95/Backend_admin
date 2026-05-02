import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';
import { Role } from 'src/roles/role.entity';
import { OneToOne } from 'typeorm';
import { KycRecord } from '../kyc-record/kyc-record.entity';

@Entity('clients')
export class Client {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ unique: true })
  access_code: string;

  @Column({ default: false })
  is_code_used: boolean;

  // Agent who created the client
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @Column()
  created_by: number;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;
  
  @Column({ default: 3 })      
  role_id: number;
  
  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @OneToOne(() => KycRecord, (kyc) => kyc.client)
  kycRecord: KycRecord;
}