import type { Clock, IdGenerator } from "@rmsm/core";
import type { RoleRepository } from "../../repositories/role-repository.interface";
import type { RoleAssignmentRepository } from "../../repositories/role-assignment-repository.interface";
import type { Role } from "../../domain/entities/role.entity";
import { RoleNotFoundError, RoleAlreadyExistsError } from "../../domain/errors/agent-security-domain.errors";
import type { EventPublisher } from "../../events/event-publisher.interface";
import type { RoleAssignedEvent } from "../../events/agent-security-domain-events.interface";

/** The "permissions" and "role-based access" capabilities: define
 * roles as permission bundles, assign them to actors, and resolve an
 * actor's full permission set — the exact list AI-402's
 * `ToolInvocation.grantedPermissions` (and its unmodified
 * `StaticPermissionChecker`) already expects. */
export class RoleService {
  constructor(
    private readonly roleRepository: RoleRepository,
    private readonly assignmentRepository: RoleAssignmentRepository,
    private readonly clock: Clock,
    private readonly idGenerator: IdGenerator,
    private readonly eventPublisher?: EventPublisher,
  ) {}

  async defineRole(name: string, permissions: readonly string[]): Promise<Role> {
    const existing = await this.roleRepository.findByName(name);
    if (existing) {
      throw new RoleAlreadyExistsError(name);
    }
    const role: Role = { name, permissions };
    await this.roleRepository.save(role);
    return role;
  }

  async assignRole(actorId: string, roleName: string): Promise<void> {
    const role = await this.roleRepository.findByName(roleName);
    if (!role) {
      throw new RoleNotFoundError(roleName);
    }
    await this.assignmentRepository.assign(actorId, roleName);

    const event: RoleAssignedEvent = {
      eventId: this.idGenerator.generate(),
      kind: "RoleAssigned",
      occurredAt: this.clock.now(),
      aggregateId: actorId,
      actorId,
      roleName,
    };
    if (this.eventPublisher) {
      await this.eventPublisher.publish([event]);
    }
  }

  /** Unions every permission granted by every role assigned to
   * `actorId` — this IS the "resolve `grantedPermissions`" seam for
   * `@rmsm/ai-tools`. */
  async listPermissions(actorId: string): Promise<readonly string[]> {
    const roleNames = await this.assignmentRepository.listRoleNames(actorId);
    const permissions = new Set<string>();
    for (const roleName of roleNames) {
      const role = await this.roleRepository.findByName(roleName);
      if (role) {
        for (const permission of role.permissions) {
          permissions.add(permission);
        }
      }
    }
    return [...permissions];
  }

  async hasPermission(actorId: string, permission: string): Promise<boolean> {
    return (await this.listPermissions(actorId)).includes(permission);
  }
}
