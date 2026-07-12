import { Injectable } from "@nestjs/common";
import { prisma, InvoiceLine, DbClient } from "@rmsm/database";

export interface CreateInvoiceLineInput {
  invoiceId: string;
  description: string;
  quantity?: number;
  unitAmountCents: number;
  amountCents: number;
}

@Injectable()
export class InvoiceLineRepository {
  create(data: CreateInvoiceLineInput, client: DbClient = prisma): Promise<InvoiceLine> {
    return client.invoiceLine.create({ data });
  }

  createMany(lines: CreateInvoiceLineInput[], client: DbClient = prisma): Promise<InvoiceLine[]> {
    // Prisma's createMany() doesn't return the created rows on every
    // connector, so this creates individually within whatever transaction
    // the caller is already in (InvoiceService, Phase 3) — a handful of
    // line items per invoice, not a bulk-load scenario, so the per-row
    // round trip cost is negligible.
    return Promise.all(lines.map((line) => this.create(line, client)));
  }

  findByInvoice(invoiceId: string, client: DbClient = prisma): Promise<InvoiceLine[]> {
    return client.invoiceLine.findMany({ where: { invoiceId }, orderBy: { createdAt: "asc" } });
  }
}
