import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';
import { UserStatus } from '../../users/userstatus.entity';

export async function seedSuperAdmin(dataSource: DataSource) {
  console.log('🚀 Seeding super admin...');

  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);
  const statusRepo = dataSource.getRepository(UserStatus);

  const exists = await userRepo.findOne({
    where: { email: 'superadmin@system.com' },
  });

  if (exists) {
    console.log('⚠ Super admin already exists');
    return;
  }

  const role = await roleRepo.findOne({ where: { name: 'super_admin' } });
  const status = await statusRepo.findOne({ where: { code: 'actif' } });

  if (!role) throw new Error('Role super_admin not found');
  if (!status) throw new Error('Status actif not found');

  const hashedPassword = await bcrypt.hash('Super@12345', 10);

  const user = userRepo.create({
    first_name: 'Super',
    last_name: 'Admin',
    email: 'superadmin@system.com',
    password: hashedPassword,
    role_id: role.id,
    status: status,
  });

  await userRepo.save(user);

  console.log('✅ Super admin created');
}