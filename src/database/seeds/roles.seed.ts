import { DataSource } from 'typeorm';
import { Role } from '../../roles/role.entity';

export async function seedRoles(dataSource: DataSource) {
  console.log('🚀 Seeding roles...');

  const roleRepo = dataSource.getRepository(Role);

  const roles = ['super_admin', 'admin', 'agent'];

  for (const name of roles) {
    const exists = await roleRepo.findOne({ where: { name } });

    if (!exists) {
      await roleRepo.save(roleRepo.create({ name }));
      console.log(`✔ Inserted: ${name}`);
    }
  }

  console.log('🎉 Roles done');
}