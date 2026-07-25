import type { Role } from "../domain/entities/role.entity";

export interface RoleRepository {
  save(role: Role): Promise<void>;
  findByName(name: string): Promise<Role | null>;
}
