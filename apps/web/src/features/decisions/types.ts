export interface Decision {
  id: string;
  opportunityId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MANUAL_REVIEW";
  riskScore: number;
  riskPassed: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
