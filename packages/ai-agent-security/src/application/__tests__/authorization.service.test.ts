import { describe, expect, it } from "vitest";
import { RoleService } from "../services/role.service";
import { PolicyService } from "../services/policy.service";
import { AuthorizationService } from "../services/authorization.service";
import { InMemoryRoleRepository } from "../../infrastructure/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../infrastructure/in-memory-role-assignment.repository";
import { InMemoryPolicyRepository } from "../../infrastructure/in-memory-policy.repository";
import { InMemoryAuditRepository } from "../../infrastructure/in-memory-audit.repository";
import { PolicyEffect } from "../../domain/enums/security.enum";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildServices(events?: RecordingEventPublisher) {
  const roleRepository = new InMemoryRoleRepository();
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  const policyRepository = new InMemoryPolicyRepository();
  const auditRepository = new InMemoryAuditRepository();
  const clock = new FixedClock();
  const idGenerator = new SequentialIdGenerator();

  const roles = new RoleService(roleRepository, assignmentRepository, clock, idGenerator);
  const policies = new PolicyService(policyRepository);
  const authorization = new AuthorizationService(roles, policies, auditRepository, clock, idGenerator, events);

  return { roles, policies, authorization, auditRepository };
}

describe("AuthorizationService", () => {
  it("allows when a policy grants it and the actor's role has the permission", async () => {
    const events = new RecordingEventPublisher();
    const { roles, policies, authorization, auditRepository } = buildServices(events);

    await roles.defineRole("editor", ["docs:write"]);
    await roles.assignRole("agent-1", "editor");
    await policies.addPolicy({ id: "p1", action: "docs:write", resource: "report-1", effect: PolicyEffect.ALLOW, priority: 1 });

    const decision = await authorization.authorize("agent-1", "docs:write", "report-1");
    expect(decision.allowed).toBe(true);
    expect((await auditRepository.listByActor("agent-1"))[0]?.decision).toBe("ALLOW");
    expect(events.published.map((e) => e.kind)).toEqual(["AccessGranted"]);
  });

  it("denies when policy allows the action but no role grants the underlying permission", async () => {
    const { policies, authorization } = buildServices();
    await policies.addPolicy({ id: "p1", action: "docs:write", resource: "report-1", effect: PolicyEffect.ALLOW, priority: 1 });

    const decision = await authorization.authorize("agent-1", "docs:write", "report-1");
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain("no assigned role");
  });

  it("denies when no policy matches at all, regardless of role permissions", async () => {
    const { roles, authorization } = buildServices();
    await roles.defineRole("editor", ["docs:write"]);
    await roles.assignRole("agent-1", "editor");

    const decision = await authorization.authorize("agent-1", "docs:write", "report-1");
    expect(decision.allowed).toBe(false);
  });

  it("an explicit DENY policy overrides a role that grants the permission", async () => {
    const { roles, policies, authorization } = buildServices();
    await roles.defineRole("editor", ["docs:delete"]);
    await roles.assignRole("agent-1", "editor");
    await policies.addPolicy({ id: "p1", action: "docs:delete", resource: "report-1", effect: PolicyEffect.DENY, priority: 1 });

    const decision = await authorization.authorize("agent-1", "docs:delete", "report-1");
    expect(decision.allowed).toBe(false);
  });
});
