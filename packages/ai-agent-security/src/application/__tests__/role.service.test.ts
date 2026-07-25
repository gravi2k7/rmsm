import { describe, expect, it } from "vitest";
import { RoleService } from "../services/role.service";
import { InMemoryRoleRepository } from "../../infrastructure/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../infrastructure/in-memory-role-assignment.repository";
import { RoleNotFoundError, RoleAlreadyExistsError } from "../../domain/errors/agent-security-domain.errors";
import { FixedClock, SequentialIdGenerator, RecordingEventPublisher } from "./fakes";

function buildService(events?: RecordingEventPublisher) {
  const roleRepository = new InMemoryRoleRepository();
  const assignmentRepository = new InMemoryRoleAssignmentRepository();
  return new RoleService(roleRepository, assignmentRepository, new FixedClock(), new SequentialIdGenerator(), events);
}

describe("RoleService", () => {
  it("defines a role and rejects a duplicate", async () => {
    const service = buildService();
    await service.defineRole("reviewer", ["tools:read"]);
    await expect(service.defineRole("reviewer", [])).rejects.toThrow(RoleAlreadyExistsError);
  });

  it("assigns roles and unions their permissions for an actor", async () => {
    const events = new RecordingEventPublisher();
    const service = buildService(events);
    await service.defineRole("reader", ["docs:read"]);
    await service.defineRole("writer", ["docs:write", "docs:read"]);

    await service.assignRole("agent-1", "reader");
    await service.assignRole("agent-1", "writer");

    expect(await service.listPermissions("agent-1")).toEqual(["docs:read", "docs:write"]);
    expect(await service.hasPermission("agent-1", "docs:write")).toBe(true);
    expect(await service.hasPermission("agent-1", "docs:delete")).toBe(false);
    expect(events.published.map((e) => e.kind)).toEqual(["RoleAssigned", "RoleAssigned"]);
  });

  it("throws RoleNotFoundError when assigning an undefined role", async () => {
    const service = buildService();
    await expect(service.assignRole("agent-1", "missing")).rejects.toThrow(RoleNotFoundError);
  });

  it("returns an empty permission set for an actor with no roles", async () => {
    const service = buildService();
    expect(await service.listPermissions("agent-unknown")).toEqual([]);
  });
});
