import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { NotFoundError } from "@rmsm/shared";
import type { DeviceToken } from "@rmsm/database";
import { DeviceTokenRepository } from "./repositories/device-token.repository";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

/**
 * Self-service — a device token belongs to the authenticated user's own
 * account, not an organization's data (Phase 1's schema note: a device
 * receives push notifications regardless of which org the user is
 * currently viewing). No OrganizationRoleGuard/PermissionsGuard beyond
 * the global JwtAuthGuard — any authenticated user manages their own
 * device tokens, the same self-service pattern Module 003 used for
 * "leave organization."
 */
@ApiTags("Device Tokens")
@ApiBearerAuth()
@Controller("notifications/devices")
export class DeviceTokenController {
  constructor(private readonly deviceTokenRepository: DeviceTokenRepository) {}

  @Post()
  @ApiOperation({ operationId: "registerDeviceToken", summary: "Register (or reactivate) a push notification device token for the caller." })
  register(@Body() dto: RegisterDeviceTokenDto, @CurrentUser() user: AccessTokenPayload): Promise<DeviceToken> {
    return this.deviceTokenRepository.upsert({
      userId: user.sub,
      organizationId: dto.organizationId,
      platform: dto.platform,
      token: dto.token,
    });
  }

  @Get()
  @ApiOperation({ operationId: "listDeviceTokens", summary: "List the caller's own active device tokens." })
  list(@CurrentUser() user: AccessTokenPayload): Promise<DeviceToken[]> {
    return this.deviceTokenRepository.findActiveByUser(user.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ operationId: "deactivateDeviceToken", summary: "Deactivate one of the caller's own device tokens." })
  async deactivate(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<void> {
    const tokens = await this.deviceTokenRepository.findActiveByUser(user.sub);
    const owned = tokens.find((t) => t.id === id);
    if (!owned) throw new NotFoundError("DeviceToken", id);
    await this.deviceTokenRepository.deactivate(id);
  }
}
