import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  DefaultToolRegistry,
  StaticPermissionChecker,
  ToolExecutionService,
  ToolResultStatus,
} from "@rmsm/ai-tools";
import { RoleService } from "../services/role.service";
import { InMemoryRoleRepository } from "../../infrastructure/in-memory-role.repository";
import { InMemoryRoleAssignmentRepository } from "../../infrastructure/in-memory-role-assignment.repository";
import { FixedClock, SequentialIdGenerator } from "./fakes";

/**
 * Proves AI-409's RBAC resolves directly into AI-402's UNMODIFIED
 * `StaticPermissionChecker`/`ToolExecutionService` — no adapter class,
 * no change to ai-tools, just `RoleService.listPermissions(actorId)`
 * feeding straight into `ToolInvocation.grantedPermissions`.
 */
describe("RoleService -> @rmsm/ai-tools integration (real, unmodified ToolExecutionService)", () => {
  it("a role's permissions are exactly what's needed to pass AI-402's own permission check", async () => {
    const roles = new RoleService(new InMemoryRoleRepository(), new InMemoryRoleAssignmentRepository(), new FixedClock(), new SequentialIdGenerator());
    await roles.defineRole("report-publisher", ["reports:publish"]);
    await roles.assignRole("agent-1", "report-publisher");

    const toolRegistry = new DefaultToolRegistry();
    toolRegistry.register(
      {
        metadata: { name: "publish-report", description: "publishes a report", version: "1.0.0", tags: ["reports"] },
        parametersSchema: z.object({ reportId: z.string() }),
        requiredPermissions: ["reports:publish"],
      },
      async (input) => `published: ${(input as { reportId: string }).reportId}`,
    );

    const executionService = new ToolExecutionService(toolRegistry, new StaticPermissionChecker(), new FixedClock(), new SequentialIdGenerator());
    const grantedPermissions = await roles.listPermissions("agent-1");

    const result = await executionService.execute({ id: "inv-1", toolName: "publish-report", arguments: { reportId: "r1" }, grantedPermissions });

    expect(result.status).toBe(ToolResultStatus.SUCCEEDED);
    expect(result.output).toBe("published: r1");
  });

  it("an actor without the role is denied by AI-402's own permission check", async () => {
    const roles = new RoleService(new InMemoryRoleRepository(), new InMemoryRoleAssignmentRepository(), new FixedClock(), new SequentialIdGenerator());
    // No role defined/assigned for agent-2.

    const toolRegistry = new DefaultToolRegistry();
    toolRegistry.register(
      {
        metadata: { name: "publish-report", description: "publishes a report", version: "1.0.0", tags: ["reports"] },
        parametersSchema: z.object({ reportId: z.string() }),
        requiredPermissions: ["reports:publish"],
      },
      async () => "should not run",
    );

    const executionService = new ToolExecutionService(toolRegistry, new StaticPermissionChecker(), new FixedClock(), new SequentialIdGenerator());
    const grantedPermissions = await roles.listPermissions("agent-2");

    const result = await executionService.execute({ id: "inv-2", toolName: "publish-report", arguments: { reportId: "r1" }, grantedPermissions });

    expect(result.status).toBe(ToolResultStatus.PERMISSION_DENIED);
  });
});
