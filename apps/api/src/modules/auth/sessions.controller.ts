import { Controller, Delete, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Session, Prisma, LoginHistory } from "@rmsm/database";
import type { PaginatedResult } from "@rmsm/database";
import { SessionService } from "./services/session.service";
import { LoginHistoryService } from "./services/login-history.service";
import { LoginHistoryQueryDto } from "./dto/login-history-query.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AccessTokenPayload } from "./services/token.service";

@ApiTags("Sessions")
@ApiBearerAuth()
@Controller("sessions")
export class SessionsController {
  constructor(
    private readonly sessionService: SessionService,
    private readonly loginHistoryService: LoginHistoryService,
  ) {}

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

  /**
   * `LoginHistory` rows have been written on every login attempt
   * (success and failure) since Module 002's own `AuthService` — this is
   * the first endpoint that ever reads them back. Deliberately scoped to
   * the authenticated user's own history only (`user.sub`), same
   * self-service boundary as `list()`/`revoke()` above — a platform-wide
   * "every user's login history" view is a legitimately different,
   * admin-scoped capability, not this endpoint's job.
   */
  @Get("login-history")
  @ApiOperation({ summary: "The authenticated user's own login history (successes and failures), paginated." })
  loginHistory(@CurrentUser() user: AccessTokenPayload, @Query() query: LoginHistoryQueryDto): Promise<PaginatedResult<LoginHistory>> {
    return this.loginHistoryService.list(user.sub, query);
  }
}
