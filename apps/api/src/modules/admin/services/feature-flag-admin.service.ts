import { Injectable } from "@nestjs/common";
import { FeatureFlag } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import { FeatureFlagRepository, CreateFeatureFlagInput } from "../../billing/repositories/feature-flag.repository";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";

/**
 * Domain 1's "Feature Flag Management" — wraps the EXISTING billing
 * FeatureFlagRepository (Domain 2's plan-entitlement definitions)
 * additively: create/list/find were already there; this adds the actual
 * admin on/off toggle + update + delete, and is the only place
 * `FeatureFlagChanged` is published. Deliberately does not duplicate
 * FeatureFlagRepository — see that file's own Module 005 doc comment.
 */
@Injectable()
export class FeatureFlagAdminService {
  constructor(
    private readonly featureFlagRepository: FeatureFlagRepository,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  listAll(): Promise<FeatureFlag[]> {
    return this.featureFlagRepository.findAll();
  }

  async getByKey(key: string): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.findByKey(key);
    if (!flag) throw new NotFoundError("FeatureFlag", key);
    return flag;
  }

  async create(input: CreateFeatureFlagInput, actorId: string, ctx: AuditContext = {}): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.create(input);
    await this.auditService.log("feature-flag.created", {
      userId: actorId,
      entityType: "FeatureFlag",
      entityId: flag.id,
      metadata: { key: input.key },
      ...ctx,
    });
    return flag;
  }

  async update(
    id: string,
    data: { name?: string; description?: string },
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.update(id, { ...data, updatedById: actorId });
    await this.auditService.log("feature-flag.updated", {
      userId: actorId,
      entityType: "FeatureFlag",
      entityId: id,
      ...ctx,
    });
    return flag;
  }

  async setEnabled(id: string, isEnabled: boolean, actorId: string, ctx: AuditContext = {}): Promise<FeatureFlag> {
    const flag = await this.featureFlagRepository.setEnabled(id, isEnabled, actorId);
    await this.auditService.log("feature-flag.toggled", {
      userId: actorId,
      entityType: "FeatureFlag",
      entityId: id,
      metadata: { key: flag.key, isEnabled },
      ...ctx,
    });
    await this.eventPublisher.publish(MOD005_EVENTS.FEATURE_FLAG_CHANGED, {
      featureFlagId: flag.id,
      key: flag.key,
      isEnabled,
      changedById: actorId,
    });
    return flag;
  }

  async delete(id: string, actorId: string, ctx: AuditContext = {}): Promise<void> {
    await this.featureFlagRepository.delete(id);
    await this.auditService.log("feature-flag.deleted", {
      userId: actorId,
      entityType: "FeatureFlag",
      entityId: id,
      ...ctx,
    });
  }
}
