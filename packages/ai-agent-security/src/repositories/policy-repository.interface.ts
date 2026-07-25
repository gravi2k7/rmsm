import type { Policy } from "../domain/entities/policy.entity";

export interface PolicyRepository {
  save(policy: Policy): Promise<void>;
  list(): Promise<readonly Policy[]>;
}
