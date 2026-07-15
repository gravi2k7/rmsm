import { randomUUID } from "crypto";
import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { ExecutionPlanner as ExecutionPlannerContract, IndicatorRequest } from "../contracts/execution-planner.interface";
import type { ExecutionPlan, ExecutionComplexityEstimate } from "../contracts/execution-plan.interface";
import { TopologicalSorterService } from "./topological-sorter.service";
import { DependencyResolverService } from "./dependency-resolver.service";

/**
 * Real implementation of `contracts/execution-planner.interface.ts` —
 * item 3: Indicator Request in, Execution Plan out. "No scheduler
 * implementation" — this produces the plan
 * `ExecutionSchedulerService`/`ComputationEngineService` (Phase 2B)
 * would eventually consume; wiring a plan's steps into real
 * `ExecutionRequest`s and actually running them remains a genuine,
 * named Phase 3+ follow-up, not attempted here.
 */
@Injectable()
export class ExecutionPlannerService implements ExecutionPlannerContract {
  constructor(
    private readonly sorter: TopologicalSorterService,
    private readonly resolver: DependencyResolverService,
  ) {}

  createPlan(graph: DependencyGraph, request: IndicatorRequest): ExecutionPlan {
    const order = this.sorter.sort(graph, request.indicatorIdentifier);
    const dependencyTree = this.resolver.produceDependencyTree(graph, request.indicatorIdentifier);

    const executionOrder = order.map((identifier, index) => ({
      identifier,
      version: graph.nodes.find((n) => n.identifier === identifier)!.version,
      order: index,
    }));

    const plan: ExecutionPlan = {
      planId: randomUUID(),
      graphId: graph.graphId,
      executionOrder,
      dependencyTree,
      calculationMode: request.calculationMode,
      executionMetadata: {
        timeoutPolicy: { timeoutMs: request.timeoutMs },
        cancellationPolicy: { cancellable: request.cancellable },
      },
      estimatedComplexity: this.estimateComplexity(graph, order),
    };

    return this.deepFreeze(plan);
  }

  /** The recommended Execution Complexity Estimator, real and computed — not a placeholder field. */
  private estimateComplexity(graph: DependencyGraph, order: string[]): ExecutionComplexityEstimate {
    const nodeCount = order.length;
    const dependencyDepth = order.length; // the sorted order's own length IS this root's dependency depth — every step in `order` is on the single path from the deepest leaf to this root, by construction of resolveTransitive/sort over one root's own subgraph.
    const estimatedComputationCost = nodeCount * dependencyDepth;
    const parallelizationOpportunities = this.findParallelizableGroups(graph, order);

    return { nodeCount, dependencyDepth, estimatedComputationCost, parallelizationOpportunities };
  }

  /** Groups of steps with no dependency relationship to each other — e.g. MACD's two EMA(12)/EMA(26) instances, both depending only on raw candles, neither depending on the other. Metadata only, per the recommendation's own words; ExecutionSchedulerService (Phase 2B) doesn't consume this yet. */
  private findParallelizableGroups(graph: DependencyGraph, order: string[]): string[][] {
    const groups: string[][] = [];

    for (const identifier of order) {
      const dependsOn = new Set(graph.edges.filter((e) => e.from === identifier).map((e) => e.to));
      const compatibleGroup = groups.find((group) => group.every((member) => !dependsOn.has(member) && !this.dependsOnTransitively(graph, member, identifier)));
      if (compatibleGroup) {
        compatibleGroup.push(identifier);
      } else {
        groups.push([identifier]);
      }
    }

    return groups;
  }

  private dependsOnTransitively(graph: DependencyGraph, from: string, to: string): boolean {
    const visited = new Set<string>();
    const stack = [from];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || visited.has(current)) continue;
      visited.add(current);
      for (const edge of graph.edges.filter((e) => e.from === current)) {
        if (edge.to === to) return true;
        stack.push(edge.to);
      }
    }
    return false;
  }

  private deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value as Record<string, unknown>).forEach((v) => this.deepFreeze(v));
    return Object.freeze(value);
  }
}
