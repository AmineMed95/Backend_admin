// src/kyc-record/kyc-record.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KycRecord } from './kyc-record.entity';
import { KycRecordService } from './kyc-record.service';
import { KycRecordController } from './kyc-record.controller';

@Module({
  imports: [TypeOrmModule.forFeature([KycRecord])],
  controllers: [KycRecordController],
  providers: [KycRecordService],
  exports: [KycRecordService],
})
export class KycRecordModule {}