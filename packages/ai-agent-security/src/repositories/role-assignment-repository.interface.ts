export interface RoleAssignmentRepository {
  assign(actorId: string, roleName: string): Promise<void>;
  listRoleNames(actorId: string): Promise<readonly string[]>;
}
