import type { PolicyEffect } from "../enums/security.enum";

/** The "policies" capability's unit of record: an ALLOW/DENY rule for
 * one `action`+`resource` pair. `PolicyService.evaluate` picks the
 * highest-`priority` matching policy; on a priority tie, DENY wins
 * (fail closed) — the same conservative-tie-break discipline
 * `@rmsm/ai-orchestration`'s `MajorityConsensusStrategy` uses for ties. */
export interface Policy {
  readonly id: string;
  readonly action: string;
  readonly resource: string;
  readonly effect: PolicyEffect;
  readonly priority: number;
}
