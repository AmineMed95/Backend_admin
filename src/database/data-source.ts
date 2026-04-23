import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserStatus } from '../users/userstatus.entity';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host:     process.env.DB_HOST     || 'postgres',   
  port:     parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER     || 'user_admin',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME     || 'postgres',
  entities: [User, Role, UserStatus],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
});