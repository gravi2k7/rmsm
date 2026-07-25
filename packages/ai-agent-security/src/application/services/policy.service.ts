import type { PolicyRepository } from "../../repositories/policy-repository.interface";
import type { Policy } from "../../domain/entities/policy.entity";
import { PolicyEffect } from "../../domain/enums/security.enum";

/** The "policies" capability: an action+resource ALLOW/DENY rule
 * engine, independent of RBAC (a policy DENY overrides even a role
 * that grants the underlying permission — the point of a policy layer
 * on top of RBAC). Fails closed: no matching policy means DENY. */
export class PolicyService {
  constructor(private readonly policyRepository: PolicyRepository) {}

  async addPolicy(policy: Policy): Promise<void> {
    await this.policyRepository.save(policy);
  }

  async evaluate(action: string, resource: string): Promise<PolicyEffect> {
    const policies = await this.policyRepository.list();
    const matching = policies.filter((p) => p.action === action && p.resource === resource);
    if (matching.length === 0) {
      return PolicyEffect.DENY;
    }

    const sorted = [...matching].sort((a, b) => b.priority - a.priority);
    const topPriority = sorted[0]!.priority;
    const topPolicies = sorted.filter((p) => p.priority === topPriority);

    // Tie-break: DENY wins over ALLOW at the same priority (fail closed).
    return topPolicies.some((p) => p.effect === PolicyEffect.DENY) ? PolicyEffect.DENY : PolicyEffect.ALLOW;
  }
}
