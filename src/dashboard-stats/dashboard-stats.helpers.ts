import { Repository } from 'typeorm';
import { Client } from '../clients/client.entity';
import { KycRecord, KycStatus } from '../kyc-record/kyc-record.entity';
import { SupportedLang } from '../common/utils/lang.util';
import { t } from '../common/utils/translate.util';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface StatTrend {
  value: number | string;
  delta: number;
  deltaLabel: string;
}

export interface DashboardStats {
  totalClients: StatTrend;
  kycValidated: StatTrend;
  kycRejected: StatTrend;
  avgFacialScore: StatTrend;
}

export interface KycDistribution {
  total: number;
  pending:  { count: number; percentage: number };
  valid:    { count: number; percentage: number };
  invalid:  { count: number; percentage: number };
}

export interface EvolutionPoint {
  month: string;
  year: number;
  clients: number;
  rejected: number;
  validated: number;
  pending: number;
}

export interface MonthRange {
  label: string;
  year: number;
  from: Date;
  to: Date;
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

const MONTHS: Record<SupportedLang, string[]> = {
  fr: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};

/** Returns the last `count` calendar months (oldest → newest), ending with the current month. */
export function getLastMonths(now: Date, count: number, lang: SupportedLang = 'fr'): MonthRange[] {
  const names = MONTHS[lang];
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1) + i, 1);
    return {
      label: names[d.getMonth()],
      year:  d.getFullYear(),
      from:  new Date(d.getFullYear(), d.getMonth(), 1),
      to:    new Date(d.getFullYear(), d.getMonth() + 1, 1),
    };
  });
}

/** Computes a month-over-month trend object. */
export function buildTrend(cur: number, prev: number, isPercent = false): StatTrend {
  const delta = prev === 0 ? 0 : ((cur - prev) / prev) * 100;
  const sign  = delta >= 0 ? '+' : '';
  return {
    value:      isPercent ? `${cur.toFixed(1)}%` : cur,
    delta,
    deltaLabel: `${sign}${delta.toFixed(1)}%`,
  };
}

/** Returns a percentage rounded to 2 decimal places; 0 when total is 0. */
export function calcPct(n: number, total: number): number {
  return total === 0 ? 0 : Math.round((n / total) * 10000) / 100;
}

// ── Score distribution ────────────────────────────────────────────────────────

export interface ScoreBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface ScoreDistribution {
  total: number;
  buckets: ScoreBucket[];
}

export const SCORE_BUCKETS: { key: string; range: string }[] = [
  { key: 'lt60',   range: '< 60'   },
  { key: 's60_69', range: '60–69'  },
  { key: 's70_79', range: '70–79'  },
  { key: 's80_89', range: '80–89'  },
  { key: 's90',    range: '90–100' },
];

// ── Activity ──────────────────────────────────────────────────────────────────

export type ActivityType =
  | 'creation_client'
  | 'modification_client'
  | 'kyc_valide'
  | 'kyc_rejete';

export interface ActivityItem {
  adminId: number;
  adminName: string;
  adminInitials: string;
  action: ActivityType;
  actionLabel: string;
  clientName: string;
  performedAt: Date;
  timeAgo: string;
}

/** Returns initials from first + last name (e.g. "Karim Benali" → "KB"). */
export function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

/** Returns the translated action label for a given activity type. */
export function getActionLabel(type: ActivityType, lang: SupportedLang): string {
  return t(`dashboard.actions.${type}`, lang);
}

/** Returns a translated relative time label (e.g. "il y a 7min" / "7min ago"). */
export function timeAgo(date: Date, now: Date, lang: SupportedLang = 'fr'): string {
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (diffMin < 1)  return t('dashboard.time.instant', lang);
  if (diffMin < 60) return t('dashboard.time.minutes', lang, { n: diffMin });
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return t('dashboard.time.hours',   lang, { n: diffH });
  const diffD = Math.floor(diffH / 24);
  return              t('dashboard.time.days',    lang, { n: diffD });
}

// ── Query helpers ─────────────────────────────────────────────────────────────

export function countClients(
  repo: Repository<Client>,
  from: Date,
  to: Date,
  adminId?: number,
) {
  const qb = repo
    .createQueryBuilder('c')
    .where('c.created_at >= :from AND c.created_at < :to', { from, to });
  if (adminId) qb.andWhere('c.created_by = :adminId', { adminId });
  return qb.getCount();
}

export function countKycByStatus(
  repo: Repository<KycRecord>,
  status: KycStatus,
  from: Date,
  to: Date,
  adminId?: number,
) {
  const qb = repo
    .createQueryBuilder('k')
    .where('k.status = :status AND k.created_at >= :from AND k.created_at < :to', { status, from, to });
  if (adminId) qb.leftJoin('k.client', 'kc').andWhere('kc.created_by = :adminId', { adminId });
  return qb.getCount();
}

export function countKycInvalid(
  repo: Repository<KycRecord>,
  from: Date,
  to: Date,
  adminId?: number,
) {
  const qb = repo
    .createQueryBuilder('k')
    .withDeleted()
    .where('k.created_at >= :from AND k.created_at < :to', { from, to })
    .andWhere('(k.status = :s OR k.deleted_at IS NOT NULL)', { s: KycStatus.INVALID });
  if (adminId) qb.leftJoin('k.client', 'kc').andWhere('kc.created_by = :adminId', { adminId });
  return qb.getCount();
}

export function avgFacialScore(
  repo: Repository<KycRecord>,
  from: Date,
  to: Date,
  adminId?: number,
) {
  const qb = repo
    .createQueryBuilder('k')
    .select('AVG(k.facialMatchingScore)', 'avg')
    .where('k.facialMatchingScore IS NOT NULL AND k.created_at >= :from AND k.created_at < :to', { from, to });
  if (adminId) qb.leftJoin('k.client', 'kc').andWhere('kc.created_by = :adminId', { adminId });
  return qb.getRawOne<{ avg: string | null }>();
}
