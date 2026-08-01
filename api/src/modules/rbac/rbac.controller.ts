import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Role, Permission, RolePermission, UserRole, RoleWithPermissions } from "@rmsm/database";
import { RbacService, RoleDashboard, PermissionMatrixEntry } from "./rbac.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignRoleDto } from "./dto/assign-role.dto";
import { GrantPermissionDto } from "./dto/grant-permission.dto";
import { CreatePermissionDto } from "./dto/create-permission.dto";
import { UpdatePermissionDto } from "./dto/update-permission.dto";
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

  // ── Module 004 additions ────────────────────────────────────────────
  //
  // "roles/permission-matrix" and "roles/dashboard-summary"-style literal
  // routes are registered ABOVE `roles/:id` so Express doesn't try to
  // match them as a role id — same ordering rule Module 003 applied to
  // "organizations/current".

  @Get("roles/permission-matrix")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "Cross-tab of every role x every permission." })
  getPermissionMatrix(): Promise<PermissionMatrixEntry[]> {
    return this.rbacService.getPermissionMatrix();
  }

  @Get("roles/:id")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "Get a role with its granted permissions." })
  getRole(@Param("id", ParseUUIDPipe) id: string): Promise<RoleWithPermissions> {
    return this.rbacService.getRole(id);
  }

  @Patch("roles/:id")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Update a role's description." })
  updateRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Role> {
    return this.rbacService.updateRole(id, dto.description, user.sub);
  }

  @Get("roles/:id/dashboard")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "Get a role's dashboard summary (assigned users, direct + effective permission counts)." })
  getRoleDashboard(@Param("id", ParseUUIDPipe) id: string): Promise<RoleDashboard> {
    return this.rbacService.getRoleDashboard(id);
  }

  @Get("permission-categories")
  @RequirePermissions("roles.read")
  @ApiOperation({ summary: "List every distinct permission category (Permission.group)." })
  listPermissionCategories(): Promise<string[]> {
    return this.rbacService.listPermissionCategories();
  }

  @Post("permissions")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Create a new permission." })
  createPermission(@Body() dto: CreatePermissionDto, @CurrentUser() user: AccessTokenPayload): Promise<Permission> {
    return this.rbacService.createPermission(dto, user.sub);
  }

  @Patch("permissions/:id")
  @RequirePermissions("roles.write")
  @ApiOperation({ summary: "Update a permission's group/description." })
  updatePermission(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Permission> {
    return this.rbacService.updatePermission(id, dto, user.sub);
  }

  @Delete("permissions/:id")
  @RequirePermissions("roles.write")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a permission (must have zero role grants remaining)." })
  deletePermission(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.rbacService.deletePermission(id, user.sub);
  }
}
