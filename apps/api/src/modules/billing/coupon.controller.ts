import { Body, Controller, Delete, Param, ParseUUIDPipe, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import type { Coupon, Invoice } from "@rmsm/database";
import { CouponService, ApplyCouponResult } from "./services/coupon.service";
import { ValidateCouponDto } from "./dto/validate-coupon.dto";
import { ApplyCouponDto } from "./dto/apply-coupon.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { BILLING_MANAGE_ROLES } from "./constants";
import { requestContext } from "../organizations/utils/request-context.util";

@ApiTags("Billing Coupons")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/coupons")
export class CouponController {
  constructor(private readonly couponService: CouponService) {}

  @Post("validate")
  @RequirePermissions("billing.coupon.apply")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "validateCoupon", summary: "Check whether a coupon code is valid for this organization, without redeeming it." })
  validate(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: ValidateCouponDto,
  ): Promise<Coupon> {
    return this.couponService.validateCoupon(dto.code, organizationId);
  }

  @Post("apply")
  @RequirePermissions("billing.coupon.apply")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "applyCoupon", summary: "Apply a coupon to a DRAFT invoice." })
  apply(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: ApplyCouponDto,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<ApplyCouponResult> {
    return this.couponService.applyCoupon(dto.code, organizationId, dto.invoiceId, user.sub, requestContext(req));
  }

  @Delete("invoices/:invoiceId")
  @RequirePermissions("billing.coupon.apply")
  @RequireOrgRole(...BILLING_MANAGE_ROLES)
  @ApiOperation({ operationId: "removeCoupon", summary: "Remove a previously applied coupon from a still-DRAFT invoice." })
  remove(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invoiceId", ParseUUIDPipe) invoiceId: string,
    @CurrentUser() user: AccessTokenPayload,
    @Req() req: Request,
  ): Promise<Invoice> {
    return this.couponService.removeCouponFromInvoice(organizationId, invoiceId, user.sub, requestContext(req));
  }
}
