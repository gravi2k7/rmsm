import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Role, Permission, RolePermission, UserRole, RoleWithPermissions } from "@rmsm/database";
import { RbacService } from "./rbac.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { GrantPermissionDto } from "./dto/grant-permission.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

@ApiTags("RBAC")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller()
export class RbacController {
  constructor(private readonly rbacService: RbacService) {}

  @Get("roles")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "List all roles with their granted permissions." })
  listRoles(): Promise<RoleWithPermissions[]> {
    return this.rbacService.listRoles();
  }

  @Post("roles")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Create a custom role." })
  createRole(@Body() dto: CreateRoleDto, @CurrentUser() user: AccessTokenPayload): Promise<Role> {
    return this.rbacService.createRole(dto.name, dto.description, user.sub);
  }

  @Delete("roles/:id")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Delete a custom (non-system) role." })
  deleteRole(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.rbacService.deleteRole(id, user.sub);
  }

  @Get("permissions")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "List all available permissions." })
  listPermissions(): Promise<Permission[]> {
    return this.rbacService.listPermissions();
  }

  @Post("roles/assign")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Assign a role to a user." })
  assignRole(@Body() dto: AssignRoleDto, @CurrentUser() user: AccessTokenPayload): Promise<UserRole> {
    return this.rbacService.assignRole(dto.userId, dto.roleId, user.sub);
  }

  @Delete("roles/:roleId/users/:userId")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Revoke a role from a user." })
  revokeRole(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.rbacService.revokeRole(userId, roleId, user.sub);
  }

  @Post("roles/permissions/grant")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Grant a permission to a role." })
  grantPermission(
    @Body() dto: GrantPermissionDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<RolePermission> {
    return this.rbacService.grantPermission(dto.roleId, dto.permissionId, user.sub);
  }

  @Delete("roles/:roleId/permissions/:permissionId")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Revoke a permission from a role." })
  revokePermission(
    @Param("roleId", ParseUUIDPipe) roleId: string,
    @Param("permissionId", ParseUUIDPipe) permissionId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<void> {
    return this.rbacService.revokePermission(roleId, permissionId, user.sub);
  }
}
