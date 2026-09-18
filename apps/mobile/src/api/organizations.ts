import { ApiClient } from "./client";

export type Organization = {
  id: string;
  name: string;
  slug: string;
  displayName?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  timezone: string;
  currency: string;
  country?: string | null;
  website?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationListResponse = {
  items: Organization[];
  total: number;
};

export class OrganizationsApi {
  constructor(private readonly client: ApiClient) {}

  list(): Promise<OrganizationListResponse> {
    return this.client.request<OrganizationListResponse>(
      "organizations?take=100",
    );
  }

  get(organizationId: string): Promise<Organization> {
    return this.client.request<Organization>(
      `organizations/${encodeURIComponent(organizationId)}`,
    );
  }
}
