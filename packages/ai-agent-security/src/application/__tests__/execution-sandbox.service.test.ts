import { describe, expect, it } from "vitest";
import { RoleService } from "../services/role.service";
import { PolicyService } from "../services/policy.service";
import { AuthorizationService } from "../services/authorization.service";
import { ExecutionSandboxService } from "../services/execution-sandbox.service";
import { InMemoryRoleRepository } from "../../infrastructure/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../infrastructure/in-memory-role-assignment.repository";
import { InMemoryPolicyRepository } from "../../infrastructure/in-memory-policy.repository";
import { InMemoryAuditRepository } from "../../infrastructure/in-memory-audit.repository";
import { FixedWindowRateLimiter } from "../../infrastructure/fixed-window-rate.limiter";
import { PolicyEffect } from "../../domain/enums/security.enum";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildSandbox(limit: number, events?: RecordingEventPublisher) {
  const clock = new FixedClock();
  const idGenerator = new SequentialIdGenerator();
  const roles = new RoleService(new InMemoryRoleRepository(), new InMemoryRoleAssignmentRepository(), clock, idGenerator);
  const policies = new PolicyService(new InMemoryPolicyRepository());
  const authorization = new AuthorizationService(roles, policies, new InMemoryAuditRepository(), clock, idGenerator);
  const rateLimiter = new FixedWindowRateLimiter(clock, limit, 1000);
  const sandbox = new ExecutionSandboxService(authorization, rateLimiter, clock, idGenerator, events);
  return { roles, policies, sandbox };
}

describe("ExecutionSandboxService", () => {
  it("denies once the rate limit is exceeded, without even reaching authorization", async () => {
    const events = new RecordingEventPublisher();
    const { roles, policies, sandbox } = buildSandbox(1, events);
    await roles.defineRole("editor", ["docs:write"]);
    await roles.assignRole("agent-1", "editor");
    await policies.addPolicy({ id: "p1", action: "docs:write", resource: "report-1", effect: PolicyEffect.ALLOW, priority: 1 });

    const first = await sandbox.guard("agent-1", "docs:write", "report-1");
    expect(first.allowed).toBe(true);

    const second = await sandbox.guard("agent-1", "docs:write", "report-1");
    expect(second.allowed).toBe(false);
    expect(second.reason).toContain("rate limit");
    expect(events.published.some((e) => e.kind === "RateLimitExceeded")).toBe(true);
  });

  it("delegates to authorization once under the rate limit", async () => {
    const { sandbox } = buildSandbox(5);
    const decision = await sandbox.guard("agent-1", "docs:write", "report-1");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).not.toContain("rate limit");
  });
});
