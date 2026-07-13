import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Invoice, InvoiceWithLines } from "@rmsm/database";
import { InvoiceService } from "./services/invoice.service";
import { InvoiceSearchDto } from "./dto/invoice-search.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { BILLING_READ_ROLES } from "./constants";

/** Per the spec's API section: Invoices supports List and Get only — no create/update endpoint. Invoice creation is a service-layer concern (InvoiceService.createInvoice), invoked by future billing-cycle automation, not directly by API clients. */
@ApiTags("Billing Invoices")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("billing/organizations/:organizationId/invoices")
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @RequirePermissions("billing.invoice.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "listInvoices", summary: "List invoices for an organization." })
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Query() query: InvoiceSearchDto,
  ): Promise<{ items: Invoice[]; total: number }> {
    return this.invoiceService.listInvoices(
      organizationId,
      { status: query.status },
      { take: query.take, skip: query.skip },
    );
  }

  @Get(":invoiceId")
  @RequirePermissions("billing.invoice.read")
  @RequireOrgRole(...BILLING_READ_ROLES)
  @ApiOperation({ operationId: "getInvoice", summary: "Get a single invoice with its line items." })
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("invoiceId", ParseUUIDPipe) invoiceId: string,
  ): Promise<InvoiceWithLines> {
    return this.invoiceService.getInvoice(organizationId, invoiceId);
  }
}
