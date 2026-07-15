import { Injectable } from "@nestjs/common";
import { ComputationEngineService } from "./computation-engine.service";
import type { ExecutionScheduler as ExecutionSchedulerContract } from "../contracts/execution-scheduler.interface";
import type { ExecutionRequest } from "../contracts/execution-request.interface";
import type { ExecutionResult } from "../contracts/execution-result.interface";

/**
 * Real implementation of `contracts/execution-scheduler.interface.ts` —
 * sequential execution via plain `async`/`await`, genuinely real code,
 * with no claim of true parallelism (see that interface's own comment
 * for why). Not dependency-graph-aware (Phase 2C's job) — this
 * scheduler treats every request in the given array as fully
 * independent, running them one after another in array order.
 *
 * `cancelAll()` cancels every request that hasn't started yet by
 * signalling a shared internal `AbortController` — already-started
 * (mid-`ComputationEngineService.execute()`) requests are not
 * interrupted (this engine has no mechanism to abort an in-flight
 * `Indicator.calculate()` call, which is expected to be a fast, pure
 * function per Phase 1's Core Principles, not something needing
 * mid-flight cancellation).
 */
@Injectable()
export class ExecutionSchedulerService implements ExecutionSchedulerContract {
  private cancelled = false;

  constructor(private readonly engine: ComputationEngineService) {}

  async schedule(requests: ExecutionRequest[]): Promise<ExecutionResult[]> {
    this.cancelled = false;
    const results: ExecutionResult[] = [];

    for (const request of requests) {
      if (this.cancelled) {
        break;
      }
      const result = await this.engine.execute(request);
      results.push(result);
    }

    return results;
  }

  cancelAll(): void {
    this.cancelled = true;
  }
}
