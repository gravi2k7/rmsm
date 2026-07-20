export const ORGANIZATION_STATUSES = ["ACTIVE", "SUSPENDED", "ARCHIVED"] as const;
export const ORGANIZATION_ROLES = ["ADMINISTRATOR", "MANAGER", "ANALYST", "TRADER", "VIEWER"] as const;
export const MEMBERSHIP_STATUSES = ["ACTIVE", "SUSPENDED", "REMOVED"] as const;

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  timezone: string;
  currency: string;
  country?: string;
  website?: string;
  status: (typeof ORGANIZATION_STATUSES)[number];
  createdAt: string;
}

export interface Member {
  id: string;
  organizationId: string;
  userId: string;
  role: (typeof ORGANIZATION_ROLES)[number] | "OWNER";
  status: (typeof MEMBERSHIP_STATUSES)[number];
  joinedAt: string;
  user: {
    id: string;
    email: string;
    status: string;
  };
}

export interface Paginated<T> {
  items: T[];
  total: number;
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  description?: string;
  timezone?: string;
  currency?: string;
  country?: string;
  website?: string;
}

export interface UpdateOrganizationInput {
  name?: string;
  description?: string;
  timezone?: string;
  currency?: string;
  country?: string;
  website?: string;
}

export interface InviteMemberInput {
  email: string;
  role: (typeof ORGANIZATION_ROLES)[number];
}
