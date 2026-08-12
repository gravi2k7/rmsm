import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "node:events";

/**
 * Generic in-process domain-event publisher, shared across the modules
 * this milestone touches (Users, RBAC, Sessions/Auth, Audit) — a single
 * implementation rather than four copies of Module 003's
 * `OrganizationEventPublisher` pattern, since none of those events are
 * organization-scoped. Same design rationale as that class (see its own
 * file comment): a real, synchronous, in-process `EventEmitter`, not the
 * strategy-engine's Postgres-backed outbox pattern — no consumer here has
 * a cross-process-restart durability requirement today.
 *
 * Event names are plain strings (not a closed union) because this
 * publisher is intentionally reused by unrelated domains — Users, RBAC,
 * and Sessions each own their own event-name constants (see each
 * module's `events.ts`) rather than this shared class hard-coding every
 * domain's vocabulary.
 */
@Injectable()
export class DomainEventPublisher {
  private readonly logger = new Logger(DomainEventPublisher.name);
  private readonly emitter = new EventEmitter();

  constructor() {
    // Default Node EventEmitter warns past 10 listeners on one event name;
    // this publisher is deliberately shared platform-wide, so more than 10
    // legitimate subscribers across unrelated modules is expected, not a
    // leak.
    this.emitter.setMaxListeners(50);
  }

  publish(name: string, payload: Record<string, unknown>): void {
    this.logger.log({ msg: `event.${name}`, ...payload });
    this.emitter.emit(name, payload);
  }

  on(name: string, listener: (payload: Record<string, unknown>) => void): void {
    this.emitter.on(name, listener);
  }

  off(name: string, listener: (payload: Record<string, unknown>) => void): void {
    this.emitter.off(name, listener);
  }
}
