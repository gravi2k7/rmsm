import { Injectable } from "@nestjs/common";
import type { DependencyGraph } from "../contracts/dependency-graph.interface";
import type { GraphValidator as GraphValidatorContract } from "../contracts/graph-validator.interface";
import { CycleDetectorService } from "./cycle-detector.service";
import {
  InvalidGraphException,
  DependencyNotFoundException,
  CircularDependencyException,
} from "../contracts/graph.errors";

const SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;

/**
 * Real implementation of `contracts/graph-validator.interface.ts` —
 * item 6's 7 checks. **Two of the 7 don't apply at this layer, and
 * this class doesn't pretend otherwise**: "unsupported indicators" and
 * "unsupported timeframes" are `IndicatorDefinition` concerns (Phase
 * 2A) — a `DependencyGraph`'s own `DependencyNode`/`DependencyEdge`
 * shapes carry only identifiers and versions, by design (see those
 * interfaces' own comments), with no timeframe data anywhere on a
 * graph to validate. Both are already checked once, correctly, at
 * registration time (`RegistryValidatorService`) and again at
 * execution time (`ExecutionValidatorService`) — re-declaring a third,
 * narrower version of the same check here against data the graph
 * doesn't even carry would be validation theater, not real coverage.
 * The remaining 5 checks (structure, duplicates, versions, references/
 * missing-dependencies, cycles) are all genuinely graph-layer concerns,
 * and all 5 are implemented for real below.
 */
@Injectable()
export class GraphValidatorService implements GraphValidatorContract {
  constructor(private readonly cycleDetector: CycleDetectorService) {}

  validate(graph: DependencyGraph): void {
    this.validateStructure(graph);
    this.validateDuplicateNodes(graph);
    this.validateVersions(graph);
    this.validateReferences(graph);
    this.validateCycle(graph);
  }

  private validateStructure(graph: DependencyGraph): void {
    if (!graph.graphId || !graph.graphVersion) {
      throw new InvalidGraphException("A graph must have both a graphId and a graphVersion.", { graph });
    }
    if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
      throw new InvalidGraphException("A graph's nodes and edges must both be arrays.", { graph });
    }
  }

  private validateDuplicateNodes(graph: DependencyGraph): void {
    const seen = new Set<string>();
    for (const node of graph.nodes) {
      const key = `${node.identifier}@${node.version}`;
      if (seen.has(key)) {
        throw new InvalidGraphException(`Duplicate node: "${key}" appears more than once in this graph.`, { graph, node });
      }
      seen.add(key);
    }
  }

  private validateVersions(graph: DependencyGraph): void {
    for (const node of graph.nodes) {
      if (!SEMVER_PATTERN.test(node.version)) {
        throw new InvalidGraphException(`Node "${node.identifier}" has an invalid version "${node.version}" (expected semver).`, { graph, node });
      }
    }
  }

  /** Item 6's "missing dependencies" and "invalid references" together — an edge referencing an identifier with no corresponding node IS both at once (a missing dependency is exactly an invalid reference), not two separate checks that could disagree. */
  private validateReferences(graph: DependencyGraph): void {
    const nodeIds = new Set(graph.nodes.map((n) => n.identifier));
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new DependencyNotFoundException(`Edge references unknown node "${edge.from}" as its "from" side.`, { graph, edge });
      }
      if (!nodeIds.has(edge.to)) {
        throw new DependencyNotFoundException(`"${edge.from}" depends on "${edge.to}", which has no node in this graph.`, { graph, edge });
      }
    }
  }

  private validateCycle(graph: DependencyGraph): void {
    const cycleInfo = this.cycleDetector.detectCycle(graph);
    if (cycleInfo) {
      throw new CircularDependencyException(`Circular dependency detected: ${cycleInfo.cycle.join(" → ")}.`, { cycle: cycleInfo.cycle });
    }
  }
}
