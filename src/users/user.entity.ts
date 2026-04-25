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

  @Column({ nullable: true, unique: true })
  phone: string;

  @Column({ nullable: true })
  organization_name: string;

  @ManyToOne(() => UserStatus)
  @JoinColumn({ name: 'status_id' })
  status: UserStatus;

  @Column({ type: 'varchar', nullable: true })
  activation_token: string | null;

  @ManyToOne(() => Role, { eager: false })
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column()
  role_id: number;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;

  @Column({ type: 'varchar', nullable: true })
  reset_password_token: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reset_password_expires: Date | null;
}