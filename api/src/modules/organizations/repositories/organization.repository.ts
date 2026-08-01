import { Injectable } from "@nestjs/common";
import { prisma, Organization, OrganizationStatus, DbClient } from "@rmsm/database";
import { toInputJsonValue } from "@rmsm/shared";

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
  // Module 003 additions (additive) — see schema.prisma's Organization
  // model comment for displayName-vs-name rationale.
  displayName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  locale?: string;
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
  settings?: Record<string, unknown>;
  // Module 003 additions (additive) — same profile fields as
  // CreateOrganizationInput, all independently optional for partial updates.
  displayName?: string | null;
  email?: string | null;
  phone?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  locale?: string;
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
 *
 * Module 003: `toInputJsonValue` for the `settings` column now comes from
 * `@rmsm/shared` (the centralized version — see that file's comment for
 * why this repository's own hand-copied version was one of the 5 that
 * motivated extracting it) instead of a locally-declared duplicate.
 * Behavior is unchanged: same JSON round-trip, same call sites.
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
        settings: toInputJsonValue(data.settings ?? {}),
        createdById: data.createdById,
        updatedById: data.createdById,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        locale: data.locale,
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

  /**
   * Deliberately constructs the Prisma `data` object field-by-field rather
   * than `{ ...data, updatedById }`. Spreading `UpdateOrganizationDetailsInput`
   * directly into `Prisma.OrganizationUpdateInput` carried its loosely-typed
   * `settings?: Record<string, unknown>` straight through unconverted (the
   * same bug as create() above, just reached via a spread instead of a
   * direct assignment), and gave up the compile-time guarantee that only
   * the fields actually declared on `UpdateOrganizationDetailsInput` can
   * ever reach this update. Each field is assigned explicitly instead;
   * `settings` is only converted when the caller actually provided it —
   * Prisma leaves a field's column untouched whether it's omitted or
   * explicitly `undefined`, so this still behaves correctly as a partial
   * update.
   */
  updateDetails(
    id: string,
    data: UpdateOrganizationDetailsInput,
    updatedById: string | undefined,
    client: DbClient = prisma,
  ): Promise<Organization> {
    return client.organization.update({
      where: { id },
      data: {
        name: data.name,
        logoUrl: data.logoUrl,
        description: data.description,
        timezone: data.timezone,
        currency: data.currency,
        country: data.country,
        website: data.website,
        settings: data.settings !== undefined ? toInputJsonValue(data.settings) : undefined,
        updatedById,
        displayName: data.displayName,
        email: data.email,
        phone: data.phone,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        locale: data.locale,
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
