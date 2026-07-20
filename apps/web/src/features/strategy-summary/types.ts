export interface StrategySummary {
  id: string;
  name: string;
  status: "DRAFT" | "TESTING" | "PAPER_TRADING" | "PRODUCTION" | "ARCHIVED";
  enabled: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
