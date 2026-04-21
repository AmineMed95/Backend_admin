import { DataSource } from 'typeorm';
import { User } from '../users/user.entity';
import { Role } from '../roles/role.entity';
import { UserStatus } from '../users/userstatus.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'user_admin',
  password: 'password',
  database: 'postgres',

  entities: [User, Role, UserStatus],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false, // ❌ MUST BE FALSE
});