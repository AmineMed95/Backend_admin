// src/dashboard/dashboard.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/client.entity';
import { KycRecord } from '../kyc-record/kyc-record.entity';
import { DashboardStatsService } from './dashboard-stats.service';
import { DashboardStatsController } from './dashboard-stats.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Client, KycRecord])],
  providers: [DashboardStatsService],
  controllers: [DashboardStatsController],
})
export class DashboardModule {}