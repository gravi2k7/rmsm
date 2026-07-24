import { Controller, Delete, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Session, Prisma } from "@rmsm/database";
import { SessionService } from "./services/session.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import type { AccessTokenPayload } from "./services/token.service";

@ApiTags("Sessions")
@ApiBearerAuth()
@Controller("sessions")
export class SessionsController {
  constructor(private readonly sessionService: SessionService) {}

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
}
