import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Client } from '../clients/client.entity';
import { KycRecord, KycStatus } from '../kyc-record/kyc-record.entity';
import { SupportedLang } from '../common/utils/lang.util';
import {
  buildTrend,
  calcPct,
  getLastMonths,
  getInitials,
  getActionLabel,
  timeAgo,
  SCORE_BUCKETS,
  countClients,
  countKycByStatus,
  countKycInvalid,
  avgFacialScore,
  ActivityItem,
  ActivityType,
  DashboardStats,
  EvolutionPoint,
  KycDistribution,
  ScoreDistribution,
} from './dashboard-stats.helpers';

@Injectable()
export class DashboardStatsService {
  constructor(
    @InjectRepository(Client)
    private readonly clientRepo: Repository<Client>,
    @InjectRepository(KycRecord)
    private readonly kycRepo: Repository<KycRecord>,
  ) {}

  async getRecentActivity(limit = 20, lang: SupportedLang = 'fr'): Promise<ActivityItem[]> {
    const now   = new Date();
    const fetch = limit * 2;

    const [creations, modifications, rejections, validations] = await Promise.all([
      this.clientRepo.createQueryBuilder('c')
        .leftJoinAndSelect('c.createdBy', 'u')
        .orderBy('c.created_at', 'DESC')
        .limit(fetch)
        .getMany(),

      this.clientRepo.createQueryBuilder('c')
        .leftJoinAndSelect('c.createdBy', 'u')
        .where("c.updated_at > c.created_at + interval '5 minutes'")
        .orderBy('c.updated_at', 'DESC')
        .limit(fetch)
        .getMany(),

      this.kycRepo.createQueryBuilder('k')
        .withDeleted()
        .leftJoinAndSelect('k.client', 'c')
        .leftJoinAndSelect('c.createdBy', 'u')
        .where('k.deleted_at IS NOT NULL')
        .orderBy('k.deleted_at', 'DESC')
        .limit(fetch)
        .getMany(),

      this.kycRepo.createQueryBuilder('k')
        .leftJoinAndSelect('k.client', 'c')
        .leftJoinAndSelect('c.createdBy', 'u')
        .where('k.status = :status', { status: KycStatus.VALID })
        .orderBy('k.created_at', 'DESC')
        .limit(fetch)
        .getMany(),
    ]);

    const toItem = (
      type: ActivityType,
      performedAt: Date | null | undefined,
      adminUser: { id: number; first_name: string; last_name: string } | undefined,
      client:    { first_name: string; last_name: string } | undefined,
    ): ActivityItem | null => {
      if (!performedAt || !adminUser || !client) return null;
      return {
        adminId:       adminUser.id,
        adminName:     `${adminUser.first_name} ${adminUser.last_name}`,
        adminInitials: getInitials(adminUser.first_name, adminUser.last_name),
        action:        type,
        actionLabel:   getActionLabel(type, lang),
        clientName:    `${client.first_name} ${client.last_name}`,
        performedAt,
        timeAgo:       timeAgo(performedAt, now, lang),
      };
    };

    const items: ActivityItem[] = [
      ...creations   .map(c => toItem('creation_client',     c.created_at, c.createdBy, c)),
      ...modifications.map(c => toItem('modification_client', c.updated_at, c.createdBy, c)),
      ...rejections  .map(k => toItem('kyc_rejete',           k.deletedAt,  k.client?.createdBy, k.client)),
      ...validations .map(k => toItem('kyc_valide',           k.createdAt,  k.client?.createdBy, k.client)),
    ].filter((x): x is ActivityItem => x !== null);

    return items
      .sort((a, b) => b.performedAt.getTime() - a.performedAt.getTime())
      .slice(0, limit);
  }

  async getScoreDistribution(adminId?: number): Promise<ScoreDistribution> {
    const qb = this.kycRepo
      .createQueryBuilder('k')
      .withDeleted()
      .select("SUM(CASE WHEN k.facialMatchingScore < 60 THEN 1 ELSE 0 END)",                                   'lt60')
      .addSelect("SUM(CASE WHEN k.facialMatchingScore >= 60 AND k.facialMatchingScore < 70 THEN 1 ELSE 0 END)", 's60_69')
      .addSelect("SUM(CASE WHEN k.facialMatchingScore >= 70 AND k.facialMatchingScore < 80 THEN 1 ELSE 0 END)", 's70_79')
      .addSelect("SUM(CASE WHEN k.facialMatchingScore >= 80 AND k.facialMatchingScore < 90 THEN 1 ELSE 0 END)", 's80_89')
      .addSelect("SUM(CASE WHEN k.facialMatchingScore >= 90 THEN 1 ELSE 0 END)",                                's90')
      .addSelect('COUNT(k.facialMatchingScore)',                                                                 'total')
      .where('k.facialMatchingScore IS NOT NULL');

    if (adminId) qb.leftJoin('k.client', 'c').andWhere('c.created_by = :adminId', { adminId });

    const raw   = await qb.getRawOne<Record<string, string>>();
    const parse = (key: string) => parseInt(raw?.[key] ?? '0', 10);
    const total = parse('total');

    return {
      total,
      buckets: SCORE_BUCKETS.map(({ key, range }) => {
        const count = parse(key);
        return { range, count, percentage: calcPct(count, total) };
      }),
    };
  }

  async getKycDistribution(adminId?: number): Promise<KycDistribution> {
    const base = this.kycRepo.createQueryBuilder('k').withDeleted();
    if (adminId) base.leftJoin('k.client', 'c').where('c.created_by = :adminId', { adminId });

    const [total, pendingCount, validCount, invalidCount] = await Promise.all([
      base.clone().getCount(),
      base.clone().andWhere('k.status = :s AND k.deleted_at IS NULL',      { s: KycStatus.PENDING }).getCount(),
      base.clone().andWhere('k.status = :s AND k.deleted_at IS NULL',      { s: KycStatus.VALID   }).getCount(),
      base.clone().andWhere('(k.status = :s OR k.deleted_at IS NOT NULL)', { s: KycStatus.INVALID }).getCount(),
    ]);

    return {
      total,
      pending: { count: pendingCount, percentage: calcPct(pendingCount, total) },
      valid:   { count: validCount,   percentage: calcPct(validCount,   total) },
      invalid: { count: invalidCount, percentage: calcPct(invalidCount, total) },
    };
  }

  async getEvolution(adminId?: number, lang: SupportedLang = 'fr'): Promise<EvolutionPoint[]> {
    const months = getLastMonths(new Date(), 4, lang);

    return Promise.all(
      months.map(async ({ label, year, from, to }) => {
        const [clients, rejected, validated, pending] = await Promise.all([
          countClients(this.clientRepo, from, to, adminId),
          countKycInvalid(this.kycRepo, from, to, adminId),
          countKycByStatus(this.kycRepo, KycStatus.VALID, from, to, adminId),
          countKycByStatus(this.kycRepo, KycStatus.PENDING, from, to, adminId),
        ]);
        return { month: label, year, clients, rejected, validated, pending };
      }),
    );
  }

  async getStats(adminId?: number): Promise<DashboardStats> {
    const now              = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(),     1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      curClients,  prevClients,
      curValid,    prevValid,
      curRejected, prevRejected,
      curScore,    prevScore,
    ] = await Promise.all([
      countClients(this.clientRepo, startOfThisMonth, now,              adminId),
      countClients(this.clientRepo, startOfLastMonth, startOfThisMonth, adminId),
      countKycByStatus(this.kycRepo, KycStatus.VALID, startOfThisMonth, now,              adminId),
      countKycByStatus(this.kycRepo, KycStatus.VALID, startOfLastMonth, startOfThisMonth, adminId),
      countKycInvalid(this.kycRepo, startOfThisMonth, now,              adminId),
      countKycInvalid(this.kycRepo, startOfLastMonth, startOfThisMonth, adminId),
      avgFacialScore(this.kycRepo, startOfThisMonth, now,              adminId),
      avgFacialScore(this.kycRepo, startOfLastMonth, startOfThisMonth, adminId),
    ]);

    const curAvg  = curScore?.avg  ? parseFloat(curScore.avg)  : 0;
    const prevAvg = prevScore?.avg ? parseFloat(prevScore.avg) : 0;

    return {
      totalClients:   buildTrend(curClients,  prevClients),
      kycValidated:   buildTrend(curValid,    prevValid),
      kycRejected:    buildTrend(curRejected, prevRejected),
      avgFacialScore: buildTrend(curAvg,      prevAvg, true),
    };
  }
}
