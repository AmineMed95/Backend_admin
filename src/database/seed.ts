import { AppDataSource } from './data-source';
import { seedRoles } from './seeds/roles.seed';
import { seedSuperAdmin } from './seeds/super-admin.seed';
import { seedUserStatuses } from './seeds/status.seed';

async function runSeeds() {
  try {
    console.log('🌱 Starting seeds...');

    await AppDataSource.initialize();
    console.log('✅ Database connected');

    // 1️⃣ Roles first (dependency)
    await seedRoles(AppDataSource);
    console.log('✔ Roles seeded');

    // 2️⃣ Status (needed for users)
    await seedUserStatuses(AppDataSource);
    console.log('✔ Status seeded');

    // 3️⃣ Super admin (depends on role + status)
    await seedSuperAdmin(AppDataSource);
    console.log('✔ Super admin seeded');

    console.log('🎉 Seeding completed successfully');

  } catch (error) {
    console.error('❌ Seeding error:', error);

  } finally {
    await AppDataSource.destroy();
    console.log('🔌 DB connection closed');
    process.exit(0);
  }
}

runSeeds();