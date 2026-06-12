// src/dashboard/dashboard-stats.controller.ts
import { Controller, Get, UseGuards, Req, Query, Headers } from '@nestjs/common';
import { DashboardStatsService } from './dashboard-stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { resolveLang } from '../common/utils/lang.util';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('dashboard')
export class DashboardStatsController {
  constructor(private readonly statsService: DashboardStatsService) {}

  /** admin → always own data; super_admin → ?adminId filters to one admin, omit for all */
  private resolveAdminId(req: any, adminId?: string): number | undefined {
    if (req.user.role === 'admin') return req.user.userId as number;
    return adminId ? parseInt(adminId, 10) : undefined;
  }

  // GET /dashboard/stats?adminId=5
  @Get('stats')
  getStats(@Req() req: any, @Query('adminId') adminId?: string) {
    return this.statsService.getStats(this.resolveAdminId(req, adminId));
  }

  // GET /dashboard/kyc-distribution?adminId=5
  @Get('kyc-distribution')
  getKycDistribution(@Req() req: any, @Query('adminId') adminId?: string) {
    return this.statsService.getKycDistribution(this.resolveAdminId(req, adminId));
  }

  // GET /dashboard/evolution?adminId=5
  @Get('evolution')
  getEvolution(
    @Req() req: any,
    @Query('adminId') adminId?: string,
    @Headers('accept-language') lang?: string,
  ) {
    return this.statsService.getEvolution(this.resolveAdminId(req, adminId), resolveLang(lang));
  }

  // GET /dashboard/score-distribution?adminId=5
  @Get('score-distribution')
  getScoreDistribution(@Req() req: any, @Query('adminId') adminId?: string) {
    return this.statsService.getScoreDistribution(this.resolveAdminId(req, adminId));
  }

  // GET /dashboard/activity?limit=20  (super_admin only)
  @Get('activity')
  @Roles('super_admin')
  getRecentActivity(
    @Query('limit') limit?: string,
    @Headers('accept-language') lang?: string,
  ) {
    return this.statsService.getRecentActivity(
      limit ? parseInt(limit, 10) : 20,
      resolveLang(lang),
    );
  }
}
