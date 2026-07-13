import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Payment } from "@rmsm/database";
import { PaymentService } from "./services/payment.service";
import { PaginationDto } from "../organizations/dto/pagination.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { BILLING_READ_ROLES } from "./constants";

@ApiTags("Billing Payments")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/payments")
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @RequirePermissions("billing.payment.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "listPayments", summary: "List payments for an organization." })
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() query: PaginationDto,
  ): Promise<{ items: Payment[]; total: number }> {
    return this.paymentService.listPayments(organizationId, { take: query.take, skip: query.skip });
  }
}
