import type { Opportunity } from "@rmsm/opportunity";
import type { SignalCluster } from "../../domain/entities/signal-cluster.entity";

/** Groups opportunities by symbol + direction regardless of timing —
 * a coarser, always-on view distinct from `DuplicateSignalDetectionService`'s
 * time-windowed duplicate check. */
export class SignalClusteringService {
  cluster(opportunities: readonly Opportunity[]): readonly SignalCluster[] {
    const byKey = new Map<string, { symbolCode: string; direction: string; ids: string[] }>();

    for (const opportunity of opportunities) {
      const key = `${opportunity.symbolCode.value}:${opportunity.signal.direction}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.ids.push(opportunity.id);
      } else {
        byKey.set(key, { symbolCode: opportunity.symbolCode.value, direction: opportunity.signal.direction, ids: [opportunity.id] });
      }
    }

    return [...byKey.entries()].map(([key, group]) => ({ key, symbolCode: group.symbolCode, direction: group.direction, opportunityIds: group.ids }));
  }
}
