export interface Decision {
  id: string;
  opportunityId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW";
  riskScore: number;
  riskPassed: boolean;
  failedRiskChecks: string[];
  positionSizeUnits: number;
  positionSizeBasis: string;
  decidedBy?: string;
  decidedAt?: string;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
