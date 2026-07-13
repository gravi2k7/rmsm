import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { OrganizationSubscription, OrganizationSubscriptionWithPlan } from "@rmsm/database";
import { SubscriptionService } from "./services/subscription.service";
import { CreateSubscriptionDto } from "./dto/create-subscription.dto";
import { ChangeSubscriptionDto } from "./dto/change-subscription.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { BILLING_MANAGE_ROLES, BILLING_READ_ROLES } from "./constants";
import { requestContext } from "../organizations/utils/request-context.util";

@ApiTags("Billing Subscriptions")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
  @RequirePermissions("billing.subscription.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "getSubscription", summary: "Get the organization's current subscription." })
  getSubscription(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ): Promise<OrganizationSubscriptionWithPlan> {
    return this.subscriptionService.getSubscription(organizationId);
  }

  @Post()
  @RequirePermissions("billing.subscription.manage")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "createSubscription", summary: "Create the organization's subscription." })
  createSubscription(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateSubscriptionDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationSubscription> {
    return this.subscriptionService.createSubscription(
      organizationId,
      dto.planKey,
      dto.billingCycle,
      dto.billingEmail,
      user.sub,
      dto.provider ?? "MOCK",
      requestContext(req),
    );
  }

  @Patch()
  @RequirePermissions("billing.subscription.manage")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "changeSubscriptionPlan", summary: "Change the organization's subscription plan." })
  changePlan(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: ChangeSubscriptionDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationSubscription> {
    return this.subscriptionService.changePlan(organizationId, dto.planKey, user.sub, requestContext(req));
  }

  @Delete()
  @RequirePermissions("billing.subscription.manage")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "cancelSubscription", summary: "Cancel the organization's subscription." })
  cancelSubscription(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<OrganizationSubscription> {
    return this.subscriptionService.cancelSubscription(organizationId, user.sub, requestContext(req));
  }
}
