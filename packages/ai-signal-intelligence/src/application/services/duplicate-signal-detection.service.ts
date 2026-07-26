import type { Opportunity } from "@rmsm/opportunity";
import type { DuplicateSignalGroup } from "../../domain/entities/duplicate-signal-group.entity";

const DEFAULT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

/** Groups opportunities that share the same symbol + direction and were
 * generated within `windowMs` of each other — a pure data-shape
 * grouping over `Signal.generatedAt`, never a re-scoring of anything. */
export class DuplicateSignalDetectionService {
  detect(opportunities: readonly Opportunity[], windowMs = DEFAULT_WINDOW_MS): readonly DuplicateSignalGroup[] {
    const sorted = [...opportunities].sort((a, b) => a.signal.generatedAt.getTime() - b.signal.generatedAt.getTime());
    const groups: DuplicateSignalGroup[] = [];
    const consumed = new Set<string>();

    for (const anchor of sorted) {
      if (consumed.has(anchor.id)) continue;
      const key = `${anchor.symbolCode.value}:${anchor.signal.direction}`;
      const members = sorted.filter(
        (candidate) =>
          !consumed.has(candidate.id) &&
          `${candidate.symbolCode.value}:${candidate.signal.direction}` === key &&
          Math.abs(candidate.signal.generatedAt.getTime() - anchor.signal.generatedAt.getTime()) <= windowMs,
      );
      if (members.length > 1) {
        for (const member of members) consumed.add(member.id);
        groups.push({ symbolCode: anchor.symbolCode.value, direction: anchor.signal.direction, opportunityIds: members.map((m) => m.id), windowMs });
      }
    }

    return groups;
  }
}
