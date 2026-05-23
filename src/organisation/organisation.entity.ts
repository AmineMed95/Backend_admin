import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';

@Entity('organisations')
export class Organisation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name_organisation: string;

  @Column({ nullable: true })
  adresse_organisation: string;

  @Column({ nullable: true })
  phone_organisation: string;

  @Column({ nullable: true })
  logo_organisation: string;

  @CreateDateColumn({ type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updated_at: Date;
}