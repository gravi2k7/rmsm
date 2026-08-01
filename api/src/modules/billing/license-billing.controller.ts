import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { License, PaginatedResult } from "@rmsm/database";
import { LicenseService } from "../licensing/services/license.service";
import { LicenseQueryDto } from "../licensing/dto/license-query.dto";
import { AssignLicenseDto } from "../licensing/dto/assign-license.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

/**
 * Domain 2's "License Assignment" / "Enterprise Licensing" — /billing/licenses,
 * as named in the prompt's own REST API examples. Reads/writes the same
 * License model + LicenseService Domain 1's AdminController's
 * /admin/licenses uses (issuance is a platform-admin action there; this
 * controller is billing's own view over assignment status/history, plus
 * assign/revoke reachable from the billing surface too, matching the
 * prompt's explicit path). See license.repository.ts's doc comment for
 * why the model lives in its own LicensingModule.
 */
@ApiTags("Billing Licensing")
@ApiBearerAuth()
@Controller("billing/licenses")
export class LicenseBillingController {
  constructor(private readonly licenseService: LicenseService) {}

  @Get()
  @RequirePermissions("billing.license.read")
  @ApiOperation({ summary: "List/search licenses." })
  list(@Query() query: LicenseQueryDto): Promise<PaginatedResult<License>> {
    return this.licenseService.list(
      { status: query.status, type: query.type, organizationId: query.organizationId },
      { page: query.page, pageSize: query.pageSize },
    );
  }

  @Get("organizations/:organizationId")
  @RequirePermissions("billing.license.read")
  @ApiOperation({ summary: "List licenses currently assigned to an organization." })
  listForOrganization(@Param("organizationId") organizationId: string): Promise<License[]> {
    return this.licenseService.listForOrganization(organizationId);
  }

  @Post(":id/assign")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "Assign a license to an organization — publishes LicenseAssigned." })
  assign(
    @Param("id") id: string,
    @Body() dto: AssignLicenseDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<License> {
    return this.licenseService.assignToOrganization(id, dto.organizationId, user.sub);
  }

  @Post(":id/revoke")
  @RequirePermissions("admin.license.manage")
  @ApiOperation({ summary: "Revoke a license from its assigned organization." })
  revoke(@Param("id") id: string, @CurrentUser() user: AccessTokenPayload): Promise<License> {
    return this.licenseService.revoke(id, user.sub);
  }
}
