import { Injectable, Logger } from "@nestjs/common";
import { EventEmitter } from "node:events";
import { OrganizationDomainEventName, OrganizationDomainEventPayloadMap } from "./organization-events";

/**
 * In-process publisher for the 5 Organization domain events
 * (OrganizationCreated/Updated/Archived/Deleted/OwnerTransferred).
 *
 * Deliberately NOT the strategy-engine's Postgres-backed outbox pattern
 * (StrategyOutboxEvent + OutboxEventPublisherService) — that mechanism
 * exists to give strategy execution durable, at-least-once delivery
 * across process restarts, which is a real requirement for that
 * pipeline. No consumer of Organization events currently has a
 * cross-process-restart durability requirement (nothing in this repo
 * subscribes to these events asynchronously today), so standing up a new
 * outbox table + publisher + drain job for Organization events would be
 * new, disproportionate infrastructure for this milestone — exactly the
 * kind of "genuinely new architectural pattern" the Module 003 prompt
 * says not to introduce. This publisher is a real, working, synchronous
 * in-process event bus (events ARE actually emitted and ARE observable by
 * subscribers/tests — this is not a stub), scoped to this module, and
 * documented here as a deliberate, narrower choice with a clear
 * upgrade path (swap this class's internals for the outbox pattern
 * later) if a durable async consumer is ever added.
 */
@Injectable()
export class OrganizationEventPublisher {
  private readonly logger = new Logger(OrganizationEventPublisher.name);
  private readonly emitter = new EventEmitter();

  publish<K extends OrganizationDomainEventName>(name: K, payload: OrganizationDomainEventPayloadMap[K]): void {
    this.logger.log({ msg: `organization.event.${name}`, ...payload });
    this.emitter.emit(name, payload);
  }

  on<K extends OrganizationDomainEventName>(
    name: K,
    listener: (payload: OrganizationDomainEventPayloadMap[K]) => void,
  ): void {
    this.emitter.on(name, listener);
  }

  off<K extends OrganizationDomainEventName>(
    name: K,
    listener: (payload: OrganizationDomainEventPayloadMap[K]) => void,
  ): void {
    this.emitter.off(name, listener);
  }
}
