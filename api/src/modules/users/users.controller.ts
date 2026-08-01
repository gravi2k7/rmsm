import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { Profile, UserAccountSummary, UserWithProfile, UserWithRoles, Organization, User } from "@rmsm/database";
import type { PaginatedResult } from "@rmsm/database";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserDirectoryQueryDto } from "./dto/user-directory-query.dto";
import { BulkUserIdsDto } from "./dto/bulk-user-ids.dto";
import { InviteUserToOrganizationDto } from "./dto/invite-user-to-organization.dto";
import { UserManagementService } from "./services/user-management.service";
import { UserDashboardService, UserDashboard } from "./services/user-dashboard.service";
import { SessionManagementService, type SessionWithDevice } from "../auth/services/session-management.service";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { UserRepository } from "../auth/repositories/user.repository";
import { PermissionResolverService } from "../rbac/services/permission-resolver.service";
import { requestContext } from "../organizations/utils/request-context.util";
import { NotFoundError } from "@rmsm/shared";

/**
 * Module 004 additions to this controller: every `:id`-scoped admin route
 * below, plus `POST /users` and `GET /users`. The pre-existing self-service
 * routes (`GET /users/me`, `GET|PATCH /users/me/profile`) are registered
 * FIRST and are completely unchanged — new `:id`-param routes are appended
 * after them so Express never matches "me" against a `:id` pattern (the
 * same ordering rule Module 003 applied to `organizations/current`).
 */
@ApiTags("Users")
@ApiBearerAuth()
@Controller("users")
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly userManagementService: UserManagementService,
    private readonly userDashboardService: UserDashboardService,
    private readonly userRepository: UserRepository,
    private readonly permissionResolver: PermissionResolverService,
    private readonly sessionManagementService: SessionManagementService,
  ) {}

  @Get("me")
  @ApiOperation({ summary: "Get the authenticated user's account + profile." })
  me(@CurrentUser() user: AccessTokenPayload): Promise<UserAccountSummary> {
    return this.usersService.getById(user.sub);
  }

  @Get("me/profile")
  @ApiOperation({ summary: "Get the authenticated user's profile." })
  getProfile(@CurrentUser() user: AccessTokenPayload): Promise<Profile> {
    return this.usersService.getProfile(user.sub);
  }

  @Patch("me/profile")
  @ApiOperation({ summary: "Update the authenticated user's profile." })
  updateProfile(
    @CurrentUser() user: AccessTokenPayload,
    @Body() dto: UpdateProfileDto,
  ): Promise<Profile> {
    return this.usersService.updateProfile(user.sub, dto);
  }

  // ── Module 004: admin User Directory + management ──────────────────

  @Get()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Search/filter/paginate the user directory." })
  list(@Query() query: UserDirectoryQueryDto): Promise<PaginatedResult<UserWithProfile>> {
    return this.userManagementService.list(
      { search: query.search, status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Create a user account (no password — a set-password email is sent)." })
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<UserWithProfile> {
    return this.userManagementService.createUser(dto, user.sub, requestContext(req));
  }

  @Post("bulk-import")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Create multiple user accounts at once (JSON array; each behaves like POST /users)." })
  async bulkImport(
    @Body() dtos: CreateUserDto[],
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ created: number; failed: { email: string; reason: string }[] }> {
    const ctx = requestContext(req);
    let created = 0;
    const failed: { email: string; reason: string }[] = [];
    for (const dto of dtos) {
      try {
        await this.userManagementService.createUser(dto, user.sub, ctx);
        created++;
      } catch (error) {
        failed.push({ email: dto.email, reason: error instanceof Error ? error.message : "Unknown error" });
      }
    }
    return { created, failed };
  }

  @Get("bulk-export")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Export the user directory as CSV (respects the same filters as GET /users)." })
  async bulkExport(@Query() query: UserDirectoryQueryDto): Promise<string> {
    const result = await this.userManagementService.list(
      { search: query.search, status: query.status },
      { page: 1, pageSize: 500 },
    );
    const header = "id,email,status,firstName,lastName,createdAt";
    const rows = result.data.map((u) =>
      [u.id, u.email, u.status, u.profile?.firstName ?? "", u.profile?.lastName ?? "", u.createdAt.toISOString()]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(","),
    );
    return [header, ...rows].join("\n");
  }

  @Post("invite")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Invite a user (new or existing) to an organization." })
  invite(
    @Body() dto: InviteUserToOrganizationDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    return this.userManagementService.inviteToOrganization(
      dto.organizationId,
      dto.email,
      dto.role,
      user.sub,
      requestContext(req),
      { message: dto.message },
    );
  }

  @Get(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get a user account by id." })
  getById(@Param("id", ParseUUIDPipe) id: string): Promise<UserWithProfile> {
    return this.userManagementService.getById(id);
  }

  @Patch(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Update a user's account/profile fields." })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<UserWithProfile> {
    return this.userManagementService.updateUser(id, dto, user.sub, requestContext(req));
  }

  @Delete(":id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Soft-delete a user account." })
  softDelete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<User> {
    return this.userManagementService.softDelete(id, user.sub, requestContext(req));
  }

  @Post(":id/restore")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Restore a soft-deleted user account." })
  restore(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<User> {
    return this.userManagementService.restore(id, user.sub, requestContext(req));
  }

  @Post(":id/suspend")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Suspend a user account." })
  suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<User> {
    return this.userManagementService.suspend(id, user.sub, requestContext(req));
  }

  @Post(":id/activate")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Reactivate a suspended/locked/archived user account." })
  activate(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<User> {
    return this.userManagementService.activate(id, user.sub, requestContext(req));
  }

  @Post("bulk-suspend")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Suspend multiple user accounts at once." })
  bulkSuspend(
    @Body() dto: BulkUserIdsDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ count: number }> {
    return this.userManagementService.bulkUpdateStatus(dto.userIds, "SUSPENDED", user.sub, requestContext(req));
  }

  @Post("bulk-activate")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Reactivate multiple user accounts at once." })
  bulkActivate(
    @Body() dto: BulkUserIdsDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<{ count: number }> {
    return this.userManagementService.bulkUpdateStatus(dto.userIds, "ACTIVE", user.sub, requestContext(req));
  }

  @Get(":id/profile")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get any user's profile (admin)." })
  getUserProfile(@Param("id", ParseUUIDPipe) id: string): Promise<Profile | null> {
    return this.userManagementService.getProfile(id);
  }

  @Get(":id/security")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get a user's security-relevant account fields." })
  async getSecurity(@Param("id", ParseUUIDPipe) id: string): Promise<{
    status: string;
    emailVerified: boolean;
    mustChangePassword: boolean;
    failedLoginAttempts: number;
    lockedUntil: Date | null;
  }> {
    const user = await this.userManagementService.getById(id);
    return {
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      mustChangePassword: user.mustChangePassword,
      failedLoginAttempts: user.failedLoginAttempts,
      lockedUntil: user.lockedUntil,
    };
  }

  @Post(":id/reset-password")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Send a password-reset email to this user (admin-triggered)." })
  resetPassword(@Param("id", ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.userManagementService.adminResetPassword(id);
  }

  @Post(":id/force-password-change")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Require this user to change their password (flag only — enforcement happens at next login)." })
  forcePasswordChange(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<User> {
    return this.userManagementService.forcePasswordChange(id, user.sub, requestContext(req));
  }

  @Post(":id/resend-verification")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Resend this user's email-verification link (admin-triggered)." })
  resendVerification(@Param("id", ParseUUIDPipe) id: string): Promise<{ message: string }> {
    return this.userManagementService.resendVerification(id);
  }

  @Get(":id/memberships")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "List the organizations this user is an active member of." })
  listMemberships(@Param("id", ParseUUIDPipe) id: string): Promise<Organization[]> {
    return this.userManagementService.listMemberships(id);
  }

  @Post(":id/memberships/:organizationId/primary")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.write")
  @ApiOperation({ summary: "Set this user's primary (default) organization." })
  setPrimaryOrganization(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Profile> {
    return this.userManagementService.setPrimaryOrganization(id, organizationId, user.sub, requestContext(req));
  }

  @Get(":id/roles")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get a user with their assigned roles and granted permissions." })
  async getRoles(@Param("id", ParseUUIDPipe) id: string): Promise<UserWithRoles> {
    const user = await this.userRepository.findByIdWithRoles(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  }

  @Get(":id/permissions")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get a user's effective (role-hierarchy-resolved) permission keys." })
  getPermissions(@Param("id", ParseUUIDPipe) id: string): Promise<string[]> {
    return this.permissionResolver.resolveForUser(id);
  }

  @Get(":id/sessions")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "List a user's active sessions/devices (admin). Module 004 Domain 3 integration." })
  getUserSessions(@Param("id", ParseUUIDPipe) id: string): Promise<SessionWithDevice[]> {
    return this.sessionManagementService.listSessionsForUser(id);
  }

  @Get(":id/dashboard")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("users.read")
  @ApiOperation({ summary: "Get a single-user security/activity dashboard summary." })
  getDashboard(@Param("id", ParseUUIDPipe) id: string): Promise<UserDashboard> {
    return this.userDashboardService.getDashboard(id);
  }
}
