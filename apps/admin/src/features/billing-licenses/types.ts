import type { License, PaginatedResult } from "@/features/billing-shared/types";

export type { License, PaginatedResult };

export interface IssueLicenseInput {
  type: "PLATFORM" | "ENTERPRISE" | "TRIAL";
  seats?: number;
  expiresAt?: string;
  notes?: string;
}

export interface AssignLicenseInput {
  organizationId: string;
}
