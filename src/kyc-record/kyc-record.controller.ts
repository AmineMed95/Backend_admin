// src/kyc-record/kyc-record.controller.ts
import { Controller, Get, Param, Query, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
import { KycRecordService } from './kyc-record.service';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import express from 'express';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent', 'admin')
@Controller('kyc-records')
export class KycRecordController {
  constructor(private readonly kycRecordService: KycRecordService) {}

  // GET /kyc-records?status=en_attente&page=1&limit=10
    @Get()
    @Roles('admin')
    async getAllKyc(@Query() filters: KycFilterDto, @Req() req: any) {
        const adminId = req.user.userId;         
      return this.kycRecordService.findAllByAdmin(adminId, filters);
    }

  // GET /kyc-records/client/:clientId
  @Get('client/:clientId')
  findByClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.kycRecordService.findOneByClientId(clientId);
  }
}