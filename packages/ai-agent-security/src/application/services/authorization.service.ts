import type { Clock, IdGenerator } from "@rmsm/core";
import { RoleService } from "./role.service";
import { PolicyService } from "./policy.service";
import { PolicyEffect } from "../../domain/enums/security.enum";
import type { AuditRepository } from "../../repositories/audit-repository.interface";
import type { AuthorizationDecision } from "../../domain/entities/authorization-decision.entity";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { AccessGrantedEvent, AccessDeniedEvent } from "../../events/agent-security-domain-events.interface";

/** Combines "permissions"/"role-based access" (`RoleService`) with
 * "policies" (`PolicyService`) into one authorization call, auditing
 * every decision via `AuditRepository` — the "audit integration"
 * capability. A policy DENY always wins, even over a role that grants
 * the underlying permission (policies are the higher-priority layer);
 * absent any policy, RBAC alone decides. */
export class AuthorizationService {
  constructor(
    private readonly roleService: RoleService,
    private readonly policyService: PolicyService,
    private readonly auditRepository: AuditRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async authorize(actorId: string, action: string, resource: string): Promise<AuthorizationDecision> {
    const policyEffect = await this.policyService.evaluate(action, resource);

    let decision: AuthorizationDecision;
    if (policyEffect === PolicyEffect.DENY) {
      decision = { allowed: false, reason: "denied by policy (explicit DENY, or no policy allows this action)" };
    } else {
      const hasPermission = await this.roleService.hasPermission(actorId, action);
      decision = hasPermission ? { allowed: true, reason: "granted by role" } : { allowed: false, reason: `no assigned role grants permission "${action}"` };
    }

    await this.audit(actorId, action, resource, decision);
    return decision;
  }

  private async audit(actorId: string, action: string, resource: string, decision: AuthorizationDecision): Promise<void> {
    const now = this.clock.now();
    await this.auditRepository.record({
      id: this.idGenerator.generate(),
      actorId,
      action,
      resource,
      decision: decision.allowed ? "ALLOW" : "DENY",
      reason: decision.reason,
      occurredAt: now,
    });

    if (decision.allowed) {
      const event: AccessGrantedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "AccessGranted",
        occurredAt: now,
        aggregateId: actorId,
        actorId,
        action,
        resource,
      };
      await this.publish([event]);
    } else {
      const event: AccessDeniedEvent = {
        eventId: this.idGenerator.generate(),
        kind: "AccessDenied",
        occurredAt: now,
        aggregateId: actorId,
        actorId,
        action,
        resource,
        reason: decision.reason,
      };
      await this.publish([event]);
    }
  }

  private async publish(events: readonly (AccessGrantedEvent | AccessDeniedEvent)[]): Promise<void> {
    if (this.eventPublisher) {
      await this.eventPublisher.publish(events);
    }
  }
}
