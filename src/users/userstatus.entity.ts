import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('user_statuses')
export class UserStatus {

  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', unique: true }) 
  code: string | undefined;

  @Column()
  label: string;
}