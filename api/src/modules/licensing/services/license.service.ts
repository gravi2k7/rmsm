import { Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { License, LicenseType } from "@rmsm/database";
import { ConflictError, NotFoundError, ValidationError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import {
  LicenseRepository,
  CreateLicenseInput,
  LicenseListFilters,
  PageParams,
} from "../repositories/license.repository";
import { PaginatedResult } from "@rmsm/database";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";

/**
 * Domain 1 ("License Management" — issuance/CRUD, /admin/licenses) and
 * Domain 2 ("License Assignment"/"Enterprise Licensing", /billing/licenses)
 * both call this one service. See license.repository.ts's doc comment for
 * why this lives in its own LicensingModule rather than Admin or Billing.
 */
@Injectable()
export class LicenseService {
  constructor(
    private readonly licenseRepository: LicenseRepository,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async issueLicense(
    input: { type: LicenseType; seats?: number; expiresAt?: Date; notes?: string },
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<License> {
    const key = `LIC-${(randomUUID().split("-")[0] ?? "").toUpperCase()}-${(randomUUID().split("-")[0] ?? "").toUpperCase()}`;
    const created = await this.licenseRepository.create(
      { key, type: input.type, seats: input.seats, expiresAt: input.expiresAt, notes: input.notes } as CreateLicenseInput,
    );
    await this.auditService.log("license.issued", {
      userId: actorId,
      entityType: "License",
      entityId: created.id,
      metadata: { type: input.type, key },
      ...ctx,
    });
    return created;
  }

  async getById(id: string): Promise<License> {
    const license = await this.licenseRepository.findById(id);
    if (!license) throw new NotFoundError("License", id);
    return license;
  }

  list(filters: LicenseListFilters, query: PageParams): Promise<PaginatedResult<License>> {
    return this.licenseRepository.list(filters, query);
  }

  listForOrganization(organizationId: string): Promise<License[]> {
    return this.licenseRepository.findByOrganization(organizationId);
  }

  async assignToOrganization(
    licenseId: string,
    organizationId: string,
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<License> {
    const license = await this.getById(licenseId);
    if (license.status === "ACTIVE" && license.organizationId && license.organizationId !== organizationId) {
      throw new ConflictError(`License ${licenseId} is already assigned to another organization.`);
    }
    if (license.status === "REVOKED") {
      throw new ValidationError("A revoked license cannot be reassigned — issue a new one.");
    }
    const updated = await this.licenseRepository.assign(licenseId, organizationId, actorId);

    await this.auditService.log("license.assigned", {
      userId: actorId,
      entityType: "License",
      entityId: licenseId,
      metadata: { organizationId, type: updated.type },
      ...ctx,
    });
    await this.eventPublisher.publish(MOD005_EVENTS.LICENSE_ASSIGNED, {
      licenseId: updated.id,
      organizationId,
      type: updated.type,
      seats: updated.seats,
      assignedById: actorId,
      assignedAt: updated.assignedAt,
    });
    return updated;
  }

  async revoke(licenseId: string, actorId: string, ctx: AuditContext = {}): Promise<License> {
    const license = await this.getById(licenseId);
    if (license.status !== "ACTIVE") {
      throw new ValidationError(`Only an ACTIVE license can be revoked (current status: ${license.status}).`);
    }
    const updated = await this.licenseRepository.revoke(licenseId, actorId);
    await this.auditService.log("license.revoked", {
      userId: actorId,
      entityType: "License",
      entityId: licenseId,
      metadata: { organizationId: license.organizationId },
      ...ctx,
    });
    return updated;
  }

  /** Called by the maintenance sweep (Domain 2's renewal cron) — not exposed via a controller route. */
  async expireOverdueLicenses(): Promise<number> {
    const expiring = await this.licenseRepository.findExpiringBefore(new Date());
    for (const license of expiring) {
      await this.licenseRepository.markExpired(license.id);
    }
    return expiring.length;
  }
}
