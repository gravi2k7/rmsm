import type { ExecutionRequest } from "./execution-request.interface";
import type { ExecutionResult } from "./execution-result.interface";

/**
 * Extension points (item 12) — real interfaces `ComputationEngine`'s
 * constructor (this phase's implementation) accepts as OPTIONAL
 * collaborators, each defaulting to a genuinely-working no-op/pass-
 * through when absent, never a fake stand-in pretending to do
 * something it doesn't. "Prepare interfaces... do NOT implement" (item
 * 12's own words) — every interface below is real and used in a real
 * type position (`ComputationEngine`'s own constructor signature,
 * `engine/computation-engine.service.ts`); none of the 6 capabilities
 * they describe has a real, non-trivial implementation this phase.
 */

/** Future Phase 2C: resolves an indicator's own dependency chain before ComputationEngine.execute() runs. Absent this phase — an indicator with a non-empty `definition.dependencies` cannot actually execute correctly yet (a real, named limitation, not silently papered over: ComputationEngine's real implementation checks for this and throws a clear CalculationWindowException rather than silently proceeding with empty dependencyResults). */
export interface DependencyResolver {
  resolve(indicatorIdentifier: string, context: unknown): Promise<Record<string, unknown>>;
}

/** Future: executing a batch of requests across more than one process/machine, coordinating results back to one caller — genuinely out of scope for a single-instance engine, no implementation attempted. */
export interface DistributedExecutionCoordinator {
  coordinate(requests: ExecutionRequest[]): Promise<ExecutionResult[]>;
}

/** Future: true concurrent execution of independent requests (worker threads, a process pool) — distinct from ExecutionScheduler's own "future parallel execution" note, which is about SEQUENCING; this is about actual concurrent CPU work. */
export interface ParallelExecutionStrategy {
  executeParallel(requests: ExecutionRequest[]): Promise<ExecutionResult[]>;
}

/** Future: the real cache layer AI-102 Phase 1's own `contracts/cache.interface.ts` (`IndicatorResultCache`) already designed — referenced here as the extension point ComputationEngine would call into once a real implementation exists, not redeclared. */
export type CacheExtensionPoint = import("./cache.interface").IndicatorResultCache;

/** Future: offloading a genuinely compute-heavy indicator's calculation to a GPU — no indicator built through Phase 2B is remotely close to needing this; named as a real, if distant, extension point per item 12's own explicit list, not implemented or even sketched beyond this interface shape. */
export interface GpuAccelerationStrategy {
  supportsIndicator(indicatorIdentifier: string): boolean;
  executeOnGpu(request: ExecutionRequest): Promise<ExecutionResult>;
}

/** Future: running this engine across a cluster of application instances, coordinating which instance handles which request — a real, large infrastructure decision for whoever eventually needs horizontal scale beyond what ExecutionScheduler's sequential/future-parallel model provides. */
export interface ClusterExecutionCoordinator {
  routeToNode(request: ExecutionRequest): Promise<string>;
}
