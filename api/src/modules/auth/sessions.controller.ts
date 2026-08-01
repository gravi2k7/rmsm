import { Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Session, Prisma } from "@rmsm/database";
import type { PaginatedResult } from "@rmsm/database";
import { SessionService } from "./services/session.service";
import { SessionManagementService, type SessionWithDevice, type SecurityDashboard } from "./services/session-management.service";
import { SessionAdminQueryDto } from "./dto/session-admin-query.dto";
import { FailedLoginQueryDto } from "./dto/failed-login-query.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AccessTokenPayload } from "./services/token.service";
import { RequirePermissions } from "./decorators/permissions.decorator";
import { PermissionsGuard } from "./guards/permissions.guard";

@ApiTags("Sessions")
@ApiBearerAuth()
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly sessionManagementService: SessionManagementService,
  ) {}

  // ── Self-service (pre-existing, unmodified) ─────────────────────────

  @Get()
  @ApiOperation({ summary: "List the authenticated user's active sessions/devices." })
  list(@CurrentUser() user: AccessTokenPayload): Promise<Session[]> {
    return this.sessionService.listActive(user.sub);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Revoke a specific session (e.g. remote sign-out of a device)." })
  revoke(@CurrentUser() user: AccessTokenPayload, @Param("id", ParseUUIDPipe) id: string): Promise<void> {
    return this.sessionService.revoke(user.sub, id);
  }

  @Delete()
  @ApiOperation({ summary: "Revoke all sessions except the current one." })
  revokeAllOthers(@CurrentUser() user: AccessTokenPayload): Promise<Prisma.BatchPayload> {
    return this.sessionService.revokeAllExcept(user.sub, user.sessionId);
  }

  // ── Module 004 Domain 3 — admin session/device management ──────────
  //
  // Deliberately namespaced under "sessions/admin/*" rather than reusing
  // the bare `/sessions`, `/sessions/:id` paths the self-service routes
  // above already occupy (see `RbacController`'s equivalent comment for
  // the same "literal segment before :id param, no collision" discipline
  // applied across this module). "Force logout"/"revoke"/"revoke-all"
  // from the prompt's illustrative REST examples map onto
  // `POST sessions/admin/:id/force-logout` and
  // `POST sessions/admin/users/:userId/revoke-all` below.

  @Get("admin")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.read")
  @ApiOperation({ summary: "List sessions across all users (admin), optionally filtered by user/status." })
  listAdmin(@Query() query: SessionAdminQueryDto): Promise<PaginatedResult<SessionWithDevice>> {
    return this.sessionManagementService.list(
      { userId: query.userId, status: query.status },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Get("admin/login-history/failed")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.read")
  @ApiOperation({ summary: "Search failed login attempts across all users (admin)." })
  failedLoginHistory(@Query() query: FailedLoginQueryDto) {
    return this.sessionManagementService.failedLoginHistory(
      { userId: query.userId, email: query.email },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Get("admin/users/:userId/security-dashboard")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.read")
  @ApiOperation({ summary: "Get a user's session/login security dashboard (admin)." })
  securityDashboard(@Param("userId", ParseUUIDPipe) userId: string): Promise<SecurityDashboard> {
    return this.sessionManagementService.getSecurityDashboard(userId);
  }

  @Post("admin/users/:userId/revoke-all")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.revoke")
  @ApiOperation({ summary: "Log out all devices for a user (admin)." })
  revokeAllForUser(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ count: number }> {
    return this.sessionManagementService.logoutAllForUser(userId, user.sub);
  }

  @Get("admin/:id")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.read")
  @ApiOperation({ summary: "Get session details, including parsed device/browser/OS info (admin)." })
  getAdmin(@Param("id", ParseUUIDPipe) id: string): Promise<SessionWithDevice> {
    return this.sessionManagementService.getById(id);
  }

  @Post("admin/:id/force-logout")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.revoke")
  @ApiOperation({ summary: "Force logout — revoke a specific session belonging to any user (admin)." })
  forceLogout(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<void> {
    return this.sessionManagementService.forceLogout(id, user.sub);
  }

  @Post("admin/:id/trust")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.revoke")
  @ApiOperation({ summary: "Mark a device/session as trusted (admin)." })
  trust(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<SessionWithDevice> {
    return this.sessionManagementService.setTrusted(id, true, user.sub);
  }

  @Post("admin/:id/untrust")
  @UseGuards(PermissionsGuard)
  @RequirePermissions("sessions.revoke")
  @ApiOperation({ summary: "Unmark a device/session as trusted (admin)." })
  untrust(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<SessionWithDevice> {
    return this.sessionManagementService.setTrusted(id, false, user.sub);
  }
}
