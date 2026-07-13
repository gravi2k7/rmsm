import { Injectable } from "@nestjs/common";
import { UsageRecord } from "@rmsm/database";
import { UsageRecordRepository } from "../repositories/usage-record.repository";

/**
 * Records and reads consumption metrics (API calls, storage, AI tokens,
 * etc. — the metrics named in the Module 004 spec's Usage Tracking
 * section). Deliberately does not check quotas itself — that's
 * QuotaService, which reads usage via this same repository but is a
 * distinct concern: recording what happened vs. deciding whether it was
 * allowed to happen. A caller enforces the quota check *before* calling
 * recordUsage, not the other way around, so a rejected request never
 * shows up in the organization's usage numbers.
 */
@Injectable()
export class UsageService {
  constructor(private readonly usageRecordRepository: UsageRecordRepository) {}

  /** First-of-month, UTC — the period key every usage row for "this month" shares. */
  currentPeriodStart(): Date {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  recordUsage(organizationId: string, metric: string, amount = 1n): Promise<UsageRecord> {
    return this.usageRecordRepository.incrementUsage(organizationId, this.currentPeriodStart(), metric, amount);
  }

  getCurrentUsage(organizationId: string): Promise<UsageRecord[]> {
    return this.usageRecordRepository.findByPeriod(organizationId, this.currentPeriodStart());
  }

  async getCurrentUsageForMetric(organizationId: string, metric: string): Promise<bigint> {
    const record = await this.usageRecordRepository.findByMetric(organizationId, this.currentPeriodStart(), metric);
    return record?.value ?? 0n;
  }

  getUsageHistory(organizationId: string, metric: string, sinceMonthsAgo: number): Promise<UsageRecord[]> {
    const now = new Date();
    const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - sinceMonthsAgo, 1));
    return this.usageRecordRepository.findHistory(organizationId, metric, from);
  }
}
