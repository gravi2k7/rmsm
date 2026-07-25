import type { PolicyRepository } from "../repositories/policy-repository.interface";
import type { Policy } from "../domain/entities/policy.entity";

export class InMemoryPolicyRepository implements PolicyRepository {
  private readonly byId = new Map<string, Policy>();

  async save(policy: Policy): Promise<void> {
    this.byId.set(policy.id, policy);
  }

  async list(): Promise<readonly Policy[]> {
    return [...this.byId.values()];
  }
}
