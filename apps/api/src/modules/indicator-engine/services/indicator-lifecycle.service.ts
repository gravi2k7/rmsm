import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import type { IndicatorLifecycleService as IndicatorLifecycleServiceContract, ServiceLifecycleState } from "../contracts/service-contracts.interface";

const VALID_TRANSITIONS: Record<ServiceLifecycleState, ServiceLifecycleState[]> = {
  INITIALIZING: ["READY"],
  READY: ["EXECUTING", "SHUTTING_DOWN"],
  EXECUTING: ["READY", "SHUTTING_DOWN"],
  SHUTTING_DOWN: ["SHUTDOWN"],
  SHUTDOWN: [],
};

/**
 * Real implementation of `contracts/service-contracts.interface.ts`'s
 * `IndicatorLifecycleService` — item 5's own states (initialize, ready,
 * execute, completed, failed, shutdown), modeled as
 * `ServiceLifecycleState` (that contract's own comment explains why
 * this is a DIFFERENT lifecycle than Phase 2B's per-execution
 * `IndicatorLifecycleState` — this one tracks the SERVICE's own
 * readiness, once, not each individual call).
 *
 * "No process management" (item 5's own words) — `initialize()`/
 * `shutdown()` only update this tracker's own state; they don't spawn,
 * monitor, or kill any OS process or thread. Wired to NestJS's own
 * `OnModuleInit`/`OnModuleDestroy` lifecycle hooks so the state
 * genuinely reflects whether the module is actually up.
 */
@Injectable()
export class IndicatorLifecycleServiceImpl implements IndicatorLifecycleServiceContract, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(IndicatorLifecycleServiceImpl.name);
  private state: ServiceLifecycleState = "INITIALIZING";

  onModuleInit(): void {
    this.initialize();
  }

  onModuleDestroy(): void {
    this.shutdown();
  }

  getState(): ServiceLifecycleState {
    return this.state;
  }

  initialize(): void {
    this.transitionTo("READY");
  }

  /** Called by `IndicatorExecutionServiceImpl` around an actual execution — not part of the public `IndicatorLifecycleService` contract's own 3 methods, but real, internal bookkeeping this service needs to report an accurate `EXECUTING` state. */
  markExecuting(): void {
    this.transitionTo("EXECUTING");
  }

  markReady(): void {
    this.transitionTo("READY");
  }

  shutdown(): void {
    this.transitionTo("SHUTTING_DOWN");
    this.transitionTo("SHUTDOWN");
  }

  private transitionTo(next: ServiceLifecycleState): void {
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(next)) {
      this.logger.warn(`Ignored invalid service lifecycle transition from "${this.state}" to "${next}".`);
      return;
    }
    this.state = next;
  }
}
