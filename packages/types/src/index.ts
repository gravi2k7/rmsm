/**
 * @rmsm/types
 * Shared TypeScript contracts consumed across apps/web, apps/admin, apps/api.
 * Module 001 ships this package empty of domain types — the first real
 * contracts (User, Auth) land in Module 001's follow-on, Module 002.
 */

/** Standard API envelope every apps/api response conforms to. */
export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

/** Standard paginated response shape. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
