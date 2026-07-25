import type { RoleAssignmentRepository } from "../repositories/role-assignment-repository.interface";

export class InMemoryRoleAssignmentRepository implements RoleAssignmentRepository {
  private readonly rolesByActor = new Map<string, Set<string>>();

  async assign(actorId: string, roleName: string): Promise<void> {
    const roles = this.rolesByActor.get(actorId) ?? new Set<string>();
    roles.add(roleName);
    this.rolesByActor.set(actorId, roles);
  }

  async listRoleNames(actorId: string): Promise<readonly string[]> {
    return [...(this.rolesByActor.get(actorId) ?? [])];
  }
}
