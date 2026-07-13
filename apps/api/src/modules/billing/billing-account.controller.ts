import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { BillingAccount } from "@rmsm/database";
import { BillingService } from "./services/billing.service";
import { CreateBillingAccountDto } from "./dto/create-billing-account.dto";
import { UpdateBillingAccountDto } from "./dto/update-billing-account.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { BILLING_MANAGE_ROLES, BILLING_READ_ROLES } from "./constants";
import { requestContext } from "../organizations/utils/request-context.util";

@ApiTags("Billing Account")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/account")
export class BillingAccountController {
  constructor(private readonly billingService: BillingService) {}

  @Get()
  @RequirePermissions("billing.account.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "getBillingAccount", summary: "Get the organization's billing account." })
  getBillingAccount(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<BillingAccount> {
    return this.billingService.getBillingAccount(organizationId);
  }

  @Post()
  @RequirePermissions("billing.account.manage")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "createBillingAccount", summary: "Create the organization's billing account." })
  createBillingAccount(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateBillingAccountDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<BillingAccount> {
    return this.billingService.createBillingAccount(
      { ...dto, organizationId },
      user.sub,
      requestContext(req),
    );
  }

  @Patch()
  @RequirePermissions("billing.account.manage")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "updateBillingAccount", summary: "Update the organization's billing account." })
  updateBillingAccount(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: UpdateBillingAccountDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<BillingAccount> {
    return this.billingService.updateBillingAccount(organizationId, dto, user.sub, requestContext(req));
  }
}
