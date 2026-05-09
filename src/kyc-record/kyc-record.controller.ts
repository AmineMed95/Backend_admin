// src/kyc-record/kyc-record.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { KycRecordService } from './kyc-record.service';
import { KycFilterDto } from './dto/kyc-filter.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('agent', 'admin')
@Controller('kyc-records')
export class KycRecordController {
  constructor(private readonly kycRecordService: KycRecordService) {}

  // GET /kyc-records?status=en_attente&page=1&limit=10
  @Get()
  @Roles('admin')
  async getAllKyc(@Query() filters: KycFilterDto, @Req() req: any) {
    return this.kycRecordService.findAllByAdmin(req.user.userId, filters);
  }

  // GET /kyc-records/client/:clientId
  @Get('client/:clientId')
  findByClient(@Param('clientId', ParseIntPipe) clientId: number) {
    return this.kycRecordService.findOneByClientId(clientId);
  }

  // US8.3 — PATCH /kyc-records/:id/status
  // Body: { "status": "valide" } or { "status": "non_valide" }
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKycStatusDto,
    @Req() req: any,
  ) {
    return this.kycRecordService.updateStatus(id, dto, req.user.userId);
  }
}