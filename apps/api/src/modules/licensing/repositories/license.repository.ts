import { Injectable } from "@nestjs/common";
import { prisma, License, LicenseStatus, LicenseType, DbClient, PaginatedResult } from "@rmsm/database";
import { paginate } from "@rmsm/database";
import type { Prisma } from "@rmsm/database";

export interface CreateLicenseInput {
  key: string;
  type: LicenseType;
  seats?: number;
  expiresAt?: Date;
  notes?: string;
}

export interface LicenseListFilters {
  status?: LicenseStatus;
  type?: LicenseType;
  organizationId?: string;
}

export interface PageParams {
  page?: number;
  pageSize?: number;
}

/**
 * Shared by both AdminModule ("License Management" — platform-wide CRUD/
 * issuance, Domain 1) and BillingModule ("License Assignment" —
 * assigning/revoking a license against an organization, Domain 2). Lives
 * in its own module (LicensingModule) specifically so neither Admin nor
 * Billing has to import the other to reach it — see licensing.module.ts.
 */
@Injectable()
export class LicenseRepository {
  create(data: CreateLicenseInput, client: DbClient = prisma): Promise<License> {
    return client.license.create({
      data: {
        key: data.key,
        type: data.type,
        seats: data.seats,
        expiresAt: data.expiresAt,
        notes: data.notes,
      },
    });
  }

  findById(id: string, client: DbClient = prisma): Promise<License | null> {
    return client.license.findUnique({ where: { id } });
  }

  findByKey(key: string, client: DbClient = prisma): Promise<License | null> {
    return client.license.findUnique({ where: { key } });
  }

  findByOrganization(organizationId: string, client: DbClient = prisma): Promise<License[]> {
    return client.license.findMany({
      where: { organizationId, status: { in: ["ACTIVE"] } },
      orderBy: { createdAt: "desc" },
    });
  }

  list(filters: LicenseListFilters, query: PageParams, client: DbClient = prisma): Promise<PaginatedResult<License>> {
    const where: Prisma.LicenseWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.organizationId ? { organizationId: filters.organizationId } : {}),
    };
    return paginate<Prisma.LicenseWhereInput, License>(client.license, where, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  assign(
    id: string,
    organizationId: string,
    assignedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<License> {
    return client.license.update({
      where: { id },
      data: {
        organizationId,
        status: "ACTIVE",
        assignedAt: new Date(),
        assignedById,
        revokedAt: null,
        revokedById: null,
      },
    });
  }

  revoke(id: string, revokedById: string | undefined, client: DbClient = prisma): Promise<License> {
    return client.license.update({
      where: { id },
      data: {
        status: "REVOKED",
        revokedAt: new Date(),
        revokedById,
      },
    });
  }

  markExpired(id: string, client: DbClient = prisma): Promise<License> {
    return client.license.update({ where: { id }, data: { status: "EXPIRED" } });
  }

  findExpiringBefore(cutoff: Date, client: DbClient = prisma): Promise<License[]> {
    return client.license.findMany({
      where: { status: "ACTIVE", expiresAt: { lte: cutoff, not: null } },
    });
  }
}
