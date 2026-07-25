import type { RoleRepository } from "../repositories/role-repository.interface";
import type { Role } from "../domain/entities/role.entity";

export class InMemoryRoleRepository implements RoleRepository {
  private readonly byName = new Map<string, Role>();

  async save(role: Role): Promise<void> {
    this.byName.set(role.name, role);
  }

  async findByName(name: string): Promise<Role | null> {
    return this.byName.get(name) ?? null;
  }
}
