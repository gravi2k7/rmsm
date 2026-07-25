import { describe, expect, it } from "vitest";
import { PolicyService } from "../services/policy.service";
import { InMemoryPolicyRepository } from "../../infrastructure/in-memory-policy.repository";
import { PolicyEffect } from "../../domain/enums/security.enum";

describe("PolicyService", () => {
  it("denies by default when no policy matches", async () => {
    const service = new PolicyService(new InMemoryPolicyRepository());
    expect(await service.evaluate("delete", "prod-db")).toBe(PolicyEffect.DENY);
  });

  it("allows when a matching policy grants it", async () => {
    const repo = new InMemoryPolicyRepository();
    const service = new PolicyService(repo);
    await service.addPolicy({ id: "p1", action: "read", resource: "docs", effect: PolicyEffect.ALLOW, priority: 1 });

    expect(await service.evaluate("read", "docs")).toBe(PolicyEffect.ALLOW);
  });

  it("prefers the higher-priority policy when multiple match", async () => {
    const repo = new InMemoryPolicyRepository();
    const service = new PolicyService(repo);
    await service.addPolicy({ id: "p1", action: "delete", resource: "prod-db", effect: PolicyEffect.ALLOW, priority: 1 });
    await service.addPolicy({ id: "p2", action: "delete", resource: "prod-db", effect: PolicyEffect.DENY, priority: 10 });

    expect(await service.evaluate("delete", "prod-db")).toBe(PolicyEffect.DENY);
  });

  it("breaks a priority tie in favor of DENY", async () => {
    const repo = new InMemoryPolicyRepository();
    const service = new PolicyService(repo);
    await service.addPolicy({ id: "p1", action: "delete", resource: "prod-db", effect: PolicyEffect.ALLOW, priority: 5 });
    await service.addPolicy({ id: "p2", action: "delete", resource: "prod-db", effect: PolicyEffect.DENY, priority: 5 });

    expect(await service.evaluate("delete", "prod-db")).toBe(PolicyEffect.DENY);
  });
});
