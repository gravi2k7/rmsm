export interface LoginHistoryEntry {
  id: string;
  email: string;
  success: boolean;
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface Session {
  id: string;
  ipAddress?: string;
  userAgent?: string;
  deviceLabel?: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt?: string;
}

/** Matches `@rmsm/database`'s own `PaginatedResult<T>` shape exactly —
 * `{ data, pagination }`, distinct from this app's other `Paginated<T>`
 * shape (`{ items, total, page, pageSize }`) used by the newer Phase 4A
 * endpoints. Two genuinely different pagination envelopes from two
 * different eras of this API, not a typo. */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}
