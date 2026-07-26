export const ReportPeriod = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
} as const;
export type ReportPeriod = (typeof ReportPeriod)[keyof typeof ReportPeriod];
export const REPORT_PERIODS = Object.values(ReportPeriod);
