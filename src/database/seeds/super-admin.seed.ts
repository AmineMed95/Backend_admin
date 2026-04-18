import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../users/user.entity';
import { Role } from '../../roles/role.entity';

export async function seedSuperAdmin(dataSource: DataSource) {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const exists = await userRepo.findOne({
    where: { email: 'superadmin@system.com' },
  });

  if (exists) return;

  const role = await roleRepo.findOne({
    where: { name: 'super_admin' },
  });

  const hashedPassword = await bcrypt.hash('Super@12345', 10);

  const user = userRepo.create({
    first_name: 'Super',
    last_name: 'Admin',
    email: 'superadmin@system.com',
    password: hashedPassword,
    role_id: role?.id,
    status: true,
  });

  await userRepo.save(user);
}