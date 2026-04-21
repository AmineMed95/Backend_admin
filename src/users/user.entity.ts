import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Role } from '../roles/role.entity';
import { UserStatus } from './userstatus.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  organization_name: string;

  @ManyToOne(() => UserStatus)
  @JoinColumn({ name: 'status_id' })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  activation_token: string | null;

  // 👇 RELATION (IMPORTANT FIX)
  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

// 👇 KEEP THIS ONLY IF YOU WANT DIRECT ACCESS
  @Column()
  role_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}