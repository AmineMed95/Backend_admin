import { DataSource } from 'typeorm';
import { UserStatus } from '../../users/userstatus.entity';

export async function seedUserStatuses(dataSource: DataSource) {
  console.log('🚀 Starting status seeder...');

  const repo = dataSource.getRepository(UserStatus);

  const statuses = [
    { code: 'actif', label: 'Actif' },
    { code: 'en_attend', label: 'En attente' },
    { code: 'inactif', label: 'Inactif' },
  ];

  for (const status of statuses) {
    const exists = await repo.findOne({
      where: { code: status.code },
    });

    if (!exists) {
      await repo.save(repo.create(status));
      console.log(`✔ Inserted: ${status.code}`);
    } else {
      console.log(`⚠ Already exists: ${status.code}`);
    }
  }

  console.log('🎉 Status seeding completed');
}