import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UserManagementService } from "./services/user-management.service";
import { UserDashboardService } from "./services/user-dashboard.service";
import { ProfileRepository } from "./repositories/profile.repository";
import { AuthModule } from "../auth/auth.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PermissionResolverModule } from "../rbac/permission-resolver.module";

/**
 * Module 004 additions: `UserManagementService`, `UserDashboardService`,
 * `ProfileRepository`, and the `AuthModule`/`OrganizationsModule`/
 * `PermissionResolverModule` imports the new admin surface needs. The
 * pre-existing `UsersService` provider is unchanged.
 */
@Module({
  imports: [AuthModule, OrganizationsModule, PermissionResolverModule],
  controllers: [UsersController],
  providers: [UsersService, UserManagementService, UserDashboardService, ProfileRepository],
  exports: [UsersService, UserManagementService, UserDashboardService, ProfileRepository],
})
export class UsersModule {}
