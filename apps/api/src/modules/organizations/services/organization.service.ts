import { Injectable } from "@nestjs/common";
import { prisma, Organization, OrganizationStatus, Prisma } from "@rmsm/database";
import { ConflictError, NotFoundError, ValidationError, checkSlugFormat } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import {
  OrganizationRepository,
  CreateOrganizationInput,
  UpdateOrganizationDetailsInput,
  OrganizationListFilters,
  PageParams,
} from "../repositories/organization.repository";
import { OrganizationMembershipRepository } from "../repositories/membership.repository";
import { OrganizationMembershipEventRepository } from "../repositories/membership-event.repository";

/**
 * Owns organization lifecycle: creation, detail updates, the dedicated
 * slug-rename flow, archive/restore, and soft delete. Membership and
 * invitation lifecycles live in their own services (OrganizationMembershipService,
 * OrganizationInvitationService) — this service does not touch
 * OrganizationMembership rows except when creating the initial Owner
 * membership as part of organization creation, which is a single atomic
 * unit with the organization itself and doesn't belong split across two
 * services.
 */
@Injectable()
export class OrganizationService {
  constructor(
    private readonly organizationRepository: OrganizationRepository,
    private readonly membershipRepository: OrganizationMembershipRepository,
    private readonly membershipEventRepository: OrganizationMembershipEventRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Creates an organization and its initial Owner membership as one atomic
   * unit — a partially-created organization with no owner (or an owner
   * with no organization) is exactly the kind of intermediate invalid
   * state Decision 1 says must never be observable.
   */
  async createOrganization(
    input: CreateOrganizationInput,
    ownerUserId: string,
    ctx: AuditContext = {},
  ): Promise<Organization> {
    this.assertValidSlug(input.slug);

    const existing = await this.organizationRepository.findBySlug(input.slug);
    if (existing) {
      throw new ConflictError(`Slug "${input.slug}" is already in use.`);
    }

    const organization = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const org = await this.organizationRepository.create(
        { ...input, createdById: ownerUserId },
        tx,
      );
      await this.membershipRepository.create(
        { organizationId: org.id, userId: ownerUserId, role: "OWNER" },
        tx,
      );
      await this.membershipEventRepository.create(
        {
          organizationId: org.id,
          userId: ownerUserId,
          action: "JOINED",
          newRole: "OWNER",
          actorId: ownerUserId,
        },
        tx,
      );
      return org;
    });

    await this.auditService.log("organization.created", {
      userId: ownerUserId,
      entityType: "Organization",
      entityId: organization.id,
      metadata: { name: organization.name, slug: organization.slug },
      ...ctx,
    });

    return organization;
  }

  async getById(id: string): Promise<Organization> {
    const org = await this.organizationRepository.findById(id);
    if (!org) throw new NotFoundError("Organization", id);
    return org;
  }

  async getBySlug(slug: string): Promise<Organization> {
    const org = await this.organizationRepository.findBySlug(slug);
    if (!org || org.deletedAt) throw new NotFoundError("Organization", slug);
    return org;
  }

  list(filters: OrganizationListFilters, page: PageParams): Promise<{ items: Organization[]; total: number }> {
    return Promise.all([
      this.organizationRepository.findMany(filters, page),
      this.organizationRepository.count(filters),
    ]).then(([items, total]) => ({ items, total }));
  }

  async updateDetails(
    id: string,
    data: UpdateOrganizationDetailsInput,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<Organization> {
    await this.getById(id); // 404s if missing/deleted

    const updated = await this.organizationRepository.updateDetails(id, data, actorId);
    await this.auditService.log("organization.updated", {
      userId: actorId,
      entityType: "Organization",
      entityId: id,
      metadata: { fields: Object.keys(data) },
      ...ctx,
    });
    return updated;
  }

  /**
   * The one and only path by which a slug may change (ADR-003: slugs are
   * permanent identifiers once assigned — this is a *rename*, the old
   * slug is never freed for reuse by anyone, including this same
   * organization reverting later).
   */
  async renameSlug(id: string, newSlug: string, actorId: string, ctx: AuditContext = {}): Promise<Organization> {
    const org = await this.getById(id);
    this.assertValidSlug(newSlug);

    if (newSlug === org.slug) {
      throw new ValidationError("New slug is the same as the current slug.");
    }

    const existing = await this.organizationRepository.findBySlug(newSlug);
    if (existing) {
      throw new ConflictError(`Slug "${newSlug}" is already in use.`);
    }

    const updated = await this.organizationRepository.renameSlug(id, newSlug, actorId);
    await this.auditService.log("organization.slug_renamed", {
      userId: actorId,
      entityType: "Organization",
      entityId: id,
      metadata: { previousSlug: org.slug, newSlug },
      ...ctx,
    });
    return updated;
  }

  async archive(id: string, actorId: string, ctx: AuditContext = {}): Promise<Organization> {
    const org = await this.getById(id);
    this.assertStatusTransition(org.status, "ARCHIVED");

    const updated = await this.organizationRepository.archive(id, actorId);
    await this.auditService.log("organization.archived", {
      userId: actorId,
      entityType: "Organization",
      entityId: id,
      ...ctx,
    });
    return updated;
  }

  async restore(id: string, actorId: string, ctx: AuditContext = {}): Promise<Organization> {
    const org = await this.getById(id);
    this.assertStatusTransition(org.status, "ACTIVE");

    const updated = await this.organizationRepository.restore(id, actorId);
    await this.auditService.log("organization.restored", {
      userId: actorId,
      entityType: "Organization",
      entityId: id,
      ...ctx,
    });
    return updated;
  }

  /** Soft delete only — see OrganizationRepository: there is no hard-delete path anywhere in this module. */
  async softDelete(id: string, actorId: string, ctx: AuditContext = {}): Promise<Organization> {
    const org = await this.getById(id);
    this.assertStatusTransition(org.status, "DELETED");

    const updated = await this.organizationRepository.softDelete(id, actorId);
    await this.auditService.log("organization.deleted", {
      userId: actorId,
      entityType: "Organization",
      entityId: id,
      ...ctx,
    });
    return updated;
  }

  private assertValidSlug(slug: string): void {
    const result = checkSlugFormat(slug);
    if (!result.valid) {
      throw new ValidationError("Invalid organization slug.", { failures: result.failures });
    }
  }

  /** ACTIVE and ARCHIVED are meaningfully reversible; DELETED is a terminal state this method still allows reaching from either. */
  private assertStatusTransition(current: OrganizationStatus, target: OrganizationStatus): void {
    if (current === target) {
      throw new ConflictError(`Organization is already ${target}.`);
    }
    if (current === "DELETED") {
      throw new ConflictError("Deleted organizations cannot change status.");
    }
  }
}
