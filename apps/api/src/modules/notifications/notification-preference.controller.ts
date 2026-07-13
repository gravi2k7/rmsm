import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { NotificationPreference } from "@rmsm/database";
import { NotificationPreferenceRepository } from "./repositories/notification-preference.repository";
import { PreferenceService } from "./services/preference.service";
import { UpdatePreferenceDto } from "./dto/update-preference.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { NOTIFICATION_READ_ROLES } from "./constants";

@ApiTags("Notification Preferences")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("notifications/organizations/:organizationId/preferences")
export class NotificationPreferenceController {
  constructor(
    private readonly preferenceRepository: NotificationPreferenceRepository,
    private readonly preferenceService: PreferenceService,
  ) {}

  @Get()
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "getPreferences", summary: "Get the caller's own notification preferences in this organization." })
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationPreference[]> {
    return this.preferenceRepository.findByUser(user.sub, organizationId);
  }

  @Patch()
  @RequirePermissions("notification.read")
  @RequireOrgRole(...NOTIFICATION_READ_ROLES)
  @ApiOperation({ operationId: "updatePreference", summary: "Set (or clear) the caller's own preference for a category/channel combination." })
  async update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdatePreferenceDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<{ message: string }> {
    // categoryKey -> categoryId resolution doesn't exist yet (no
    // NotificationCategory repository this phase — Phase 2c's flagged
    // gap). UpdatePreferenceDto's categoryKey is accepted for API-shape
    // forward-compatibility but not yet resolvable; only the
    // category-independent (categoryKey omitted) case is functional
    // today. Documented here rather than silently accepting a key that's
    // quietly ignored.
    if (dto.categoryKey) {
      return { message: "Category-scoped preferences are not yet supported — no category-key resolution exists. Omit categoryKey to set an all-categories default." };
    }
    await this.preferenceService.setPreference(user.sub, organizationId, null, dto.channel ?? null, dto.enabled);
    return { message: "Preference updated." };
  }
}
