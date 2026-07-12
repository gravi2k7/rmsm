import { Injectable } from "@nestjs/common";
import { prisma, Organization, OrganizationStatus, DbClient } from "@rmsm/database";
import { Prisma } from "@rmsm/database";

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  logoUrl?: string;
  description?: string;
  timezone?: string;
  currency?: string;
  country?: string;
  website?: string;
  settings?: Record<string, unknown>;
  createdById?: string;
}

/**
 * Excludes `slug` and `status` by construction — slug changes must go
 * through `renameSlug()`, status changes through `archive()`/`restore()`/
 * `softDelete()`. This is the repository-layer enforcement of "immutable
 * slugs except a dedicated rename flow": there is no generic `update()`
 * that could accidentally carry a slug change through, so misuse is a
 * compile error rather than a code-review concern.
 */
export interface UpdateOrganizationDetailsInput {
  name?: string;
  logoUrl?: string | null;
  description?: string | null;
  timezone?: string;
  currency?: string;
  country?: string | null;
  website?: string | null;
  settings?: Prisma.InputJsonValue;
}

export interface OrganizationListFilters {
  status?: OrganizationStatus;
  search?: string;
}

export interface PageParams {
  take: number;
  skip: number;
}

/**
 * Repository Pattern (consistent with Module 002): OrganizationService
 * (Phase 3) depends on this, never on `prisma` directly. No business rules
 * live here — "exactly one active owner", invariant checks, and
 * transaction *orchestration* across repositories all belong to the
 * service layer. This repository is single-table (`organizations` only)
 * and every method accepts an optional `client: DbClient` so a service can
 * pass a `prisma.$transaction`-scoped client through for multi-table
 * atomicity without this repository knowing anything about the other
 * tables involved.
 */
@Injectable()
export class OrganizationRepository {
  create(data: CreateOrganizationInput, client: DbClient = prisma): Promise<Organization> {
    return client.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        logoUrl: data.logoUrl,
        description: data.description,
        timezone: data.timezone,
        currency: data.currency,
        country: data.country,
        website: data.website,
        settings: (data.settings ?? {}) as Prisma.InputJsonValue,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
  }

  /** Excludes soft-deleted organizations. Archived organizations ARE returned — archival is restorable, deletion is not. */
  findById(id: string, client: DbClient = prisma): Promise<Organization | null> {
    return client.organization.findFirst({ where: { id, deletedAt: null } });
  }

  /**
   * Includes soft-deleted organizations. Needed for compliance/audit
   * lookups and — per the flagged decision in Section 5 of the Phase 2
   * doc — because `slug` carries a hard, non-partial unique constraint, so
   * a deleted organization's slug can still legitimately need to be looked
   * up (e.g. to explain to a user why a slug they want is unavailable).
   */
  findByIdIncludingDeleted(id: string, client: DbClient = prisma): Promise<Organization | null> {
    return client.organization.findUnique({ where: { id } });
  }

  findBySlug(slug: string, client: DbClient = prisma): Promise<Organization | null> {
    return client.organization.findUnique({ where: { slug } });
  }

 updateDetails(
  id: string,
  data: UpdateOrganizationDetailsInput,
  updatedById: string | undefined,
  client: DbClient = prisma,
): Promise<Organization> {
  return client.organization.update({
    where: { id },
    data: {
      ...data,
      ...(data.settings !== undefined
        ? { settings: data.settings as Prisma.InputJsonValue }
        : {}),
      ...(updatedById ? { updatedById } : {}),
    },
  });
}

  /** The one and only path by which a slug may change. */
  renameSlug(
    id: string,
    newSlug: string,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<Organization> {
    return client.organization.update({
      where: { id },
      data: { slug: newSlug, updatedById },
    });
  }

  archive(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<Organization> {
    return client.organization.update({
      where: { id },
      data: { status: "ARCHIVED", updatedById },
    });
  }

  restore(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<Organization> {
    return client.organization.update({
      where: { id },
      data: { status: "ACTIVE", updatedById },
    });
  }

  /**
   * Soft delete only — there is no hard-delete method on this repository.
   * "No hard deletes in normal workflows" is enforced by this method's
   * absence, not by a runtime guard: the operation that would violate the
   * constraint simply isn't exposed.
   */
  softDelete(id: string, updatedById: string | undefined, client: DbClient = prisma): Promise<Organization> {
    return client.organization.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date(), updatedById },
    });
  }

  findMany(
    filters: OrganizationListFilters,
    page: PageParams,
    client: DbClient = prisma,
  ): Promise<Organization[]> {
    return client.organization.findMany({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  count(filters: OrganizationListFilters, client: DbClient = prisma): Promise<number> {
    return client.organization.count({
      where: {
        deletedAt: null,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.search ? { name: { contains: filters.search, mode: "insensitive" } } : {}),
      },
    });
  }
}
