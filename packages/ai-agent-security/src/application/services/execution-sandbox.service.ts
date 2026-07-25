import type { AuthorizationService } from "./authorization.service";
import type { RateLimiter } from "../../repositories/rate-limiter.interface";
import type { AuthorizationDecision } from "../../domain/entities/authorization-decision.entity";
import type { IdGenerator, Clock } from "@rmsm/core";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { RateLimitExceededEvent } from "../../events/agent-security-domain-events.interface";

/**
 * The "execution sandbox" capability: the single choke point every
 * risky agent action should pass through before it's allowed to run —
 * rate limiting FIRST (cheapest check, protects against runaway
 * agents regardless of what they're authorized to do), then RBAC +
 * policy authorization (which itself audits the decision). Not an OS-
 * level sandbox (out of scope for this codebase) — an abstraction over
 * "is this action currently permitted to execute," composing
 * `RateLimiter` and `AuthorizationService` rather than reimplementing
 * either.
 */
export class ExecutionSandboxService {
  constructor(
    private readonly authorizationService: AuthorizationService,
    private readonly rateLimiter: RateLimiter,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async guard(actorId: string, action: string, resource: string): Promise<AuthorizationDecision> {
    const rateLimitKey = `${actorId}:${action}`;
    const rate = await this.rateLimiter.checkAndConsume(rateLimitKey);

    if (!rate.allowed) {
      const event: RateLimitExceededEvent = {
        eventId: this.idGenerator.generate(),
        kind: "RateLimitExceeded",
        occurredAt: this.clock.now(),
        aggregateId: actorId,
        key: rateLimitKey,
      };
      if (this.eventPublisher) {
        await this.eventPublisher.publish([event]);
      }
      return { allowed: false, reason: `rate limit exceeded for "${rateLimitKey}"` };
    }

    return this.authorizationService.authorize(actorId, action, resource);
  }
}
