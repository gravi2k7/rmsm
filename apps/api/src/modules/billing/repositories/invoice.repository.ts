import { Injectable } from "@nestjs/common";
import { prisma, Invoice, InvoiceWithLines, InvoiceStatus, DbClient } from "@rmsm/database";

export interface CreateInvoiceInput {
  invoiceNumber: string;
  organizationId: string;
  subscriptionId?: string;
  subtotalCents: number;
  taxCents?: number;
  discountCents?: number;
  totalCents: number;
  currency?: string;
  status?: InvoiceStatus;
  dueDate: Date;
}

export interface InvoiceListFilters {
  status?: InvoiceStatus;
}

export interface PageParams {
  take: number;
  skip: number;
}

@Injectable()
export class InvoiceRepository {
  create(data: CreateInvoiceInput, client: DbClient = prisma): Promise<Invoice> {
    return client.invoice.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<Invoice | null> {
    return client.invoice.findUnique({ where: { id } });
  }

  findByIdWithLines(id: string, client: DbClient = prisma): Promise<InvoiceWithLines | null> {
    return client.invoice.findUnique({ where: { id }, include: { lines: true } });
  }

  findByInvoiceNumber(invoiceNumber: string, client: DbClient = prisma): Promise<Invoice | null> {
    return client.invoice.findUnique({ where: { invoiceNumber } });
  }

  findByOrganization(
    organizationId: string,
    filters: InvoiceListFilters,
    page: PageParams,
    client: DbClient = prisma,
  ): Promise<Invoice[]> {
    return client.invoice.findMany({
      where: { organizationId, ...(filters.status ? { status: filters.status } : {}) },
      orderBy: { issueDate: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  countByOrganization(
    organizationId: string,
    filters: InvoiceListFilters,
    client: DbClient = prisma,
  ): Promise<number> {
    return client.invoice.count({
      where: { organizationId, ...(filters.status ? { status: filters.status } : {}) },
    });
  }

  updateStatus(
    id: string,
    status: InvoiceStatus,
    extra: { paymentDate?: Date; pdfUrl?: string } = {},
    client: DbClient = prisma,
  ): Promise<Invoice> {
    return client.invoice.update({ where: { id }, data: { status, ...extra } });
  }

  /** For CouponService: applying a redemption's discount to a draft invoice before it's finalized. */
  applyDiscount(id: string, discountCents: number, totalCents: number, client: DbClient = prisma): Promise<Invoice> {
    return client.invoice.update({ where: { id }, data: { discountCents, totalCents } });
  }
}
