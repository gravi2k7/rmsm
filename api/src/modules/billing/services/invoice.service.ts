import { Injectable } from "@nestjs/common";
import { randomBytes } from "crypto";
import { prisma, Invoice, InvoiceWithLines, Prisma } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";
import { InvoiceRepository, InvoiceListFilters, PageParams } from "../repositories/invoice.repository";
import { InvoiceLineRepository, CreateInvoiceLineInput } from "../repositories/invoice-line.repository";

export interface InvoiceLineItem {
  description: string;
  quantity?: number;
  unitAmountCents: number;
}

/**
 * Owns invoice creation (invoice + line items, atomically) and lifecycle
 * (DRAFT → OPEN → PAID/VOID/FAILED). Invoice numbering is a business
 * decision, not a database sequence — see generateInvoiceNumber()'s
 * comment for the specific scheme and why.
 */
@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly invoiceLineRepository: InvoiceLineRepository,
    private readonly auditService: AuditService,
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async createInvoice(
    organizationId: string,
    lines: InvoiceLineItem[],
    dueDate: Date,
    actorId: string,
    subscriptionId?: string,
    ctx: AuditContext = {},
  ): Promise<InvoiceWithLines> {
    if (lines.length === 0) {
      throw new ConflictError("Cannot create an invoice with no line items.");
    }

    const lineInputs: Omit<CreateInvoiceLineInput, "invoiceId">[] = lines.map((line) => ({
      description: line.description,
      quantity: line.quantity ?? 1,
      unitAmountCents: line.unitAmountCents,
      amountCents: line.unitAmountCents * (line.quantity ?? 1),
    }));
    const subtotalCents = lineInputs.reduce((sum, l) => sum + l.amountCents, 0);

    const invoiceNumber = await this.generateInvoiceNumber();

    const created = await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<Invoice> => {
      const invoice = await this.invoiceRepository.create(
        {
          invoiceNumber,
          organizationId,
          subscriptionId,
          subtotalCents,
          totalCents: subtotalCents,
          status: "DRAFT",
          dueDate,
        },
        tx,
      );
      await this.invoiceLineRepository.createMany(
        lineInputs.map((l) => ({ ...l, invoiceId: invoice.id })),
        tx,
      );
      return invoice;
    });

    await this.auditService.log("billing.invoice.created", {
      userId: actorId,
      entityType: "Invoice",
      entityId: created.id,
      metadata: { organizationId, invoiceNumber, subtotalCents },
      ...ctx,
    });

    const withLines = await this.invoiceRepository.findByIdWithLines(created.id);
    if (!withLines) throw new NotFoundError("Invoice", created.id);

    await this.eventPublisher.publish(MOD005_EVENTS.INVOICE_GENERATED, {
      invoiceId: created.id,
      organizationId,
      invoiceNumber,
      totalCents: subtotalCents,
    });

    return withLines;
  }

  async getInvoice(organizationId: string, invoiceId: string): Promise<InvoiceWithLines> {
    const invoice = await this.invoiceRepository.findByIdWithLines(invoiceId);
    if (!invoice || invoice.organizationId !== organizationId) {
      throw new NotFoundError("Invoice", invoiceId);
    }
    return invoice;
  }

  async listInvoices(
    organizationId: string,
    filters: InvoiceListFilters,
    page: PageParams,
  ): Promise<{ items: Invoice[]; total: number }> {
    const [items, total] = await Promise.all([
      this.invoiceRepository.findByOrganization(organizationId, filters, page),
      this.invoiceRepository.countByOrganization(organizationId, filters),
    ]);
    return { items, total };
  }

  async markPaid(organizationId: string, invoiceId: string, actorId: string, ctx: AuditContext = {}): Promise<Invoice> {
    const invoice = await this.getInvoice(organizationId, invoiceId);
    if (invoice.status === "PAID") {
      throw new ConflictError("Invoice is already marked paid.");
    }

    const updated = await this.invoiceRepository.updateStatus(invoiceId, "PAID", { paymentDate: new Date() });
    await this.auditService.log("billing.invoice.paid", {
      userId: actorId,
      entityType: "Invoice",
      entityId: invoiceId,
      metadata: { organizationId },
      ...ctx,
    });
    return updated;
  }

  async voidInvoice(organizationId: string, invoiceId: string, actorId: string, ctx: AuditContext = {}): Promise<Invoice> {
    const invoice = await this.getInvoice(organizationId, invoiceId);
    if (invoice.status === "PAID") {
      throw new ConflictError("Cannot void an invoice that has already been paid.");
    }

    const updated = await this.invoiceRepository.updateStatus(invoiceId, "VOID");
    await this.auditService.log("billing.invoice.voided", {
      userId: actorId,
      entityType: "Invoice",
      entityId: invoiceId,
      ...ctx,
    });
    return updated;
  }

  /**
   * Format: INV-{year}-{6 random hex chars}, retried on the rare unique-
   * constraint collision. Not a strictly sequential/incrementing number —
   * this project's schema has no dedicated sequence table, and a random
   * suffix avoids the concurrency contention a shared counter would
   * introduce under simultaneous invoice creation. If strict sequential
   * numbering becomes a compliance requirement later, that's a schema
   * addition (a Counter table), not a service-layer change.
   */
  private async generateInvoiceNumber(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = `INV-${new Date().getFullYear()}-${randomBytes(3).toString("hex").toUpperCase()}`;
      const existing = await this.invoiceRepository.findByInvoiceNumber(candidate);
      if (!existing) return candidate;
    }
    throw new ConflictError("Failed to generate a unique invoice number after 5 attempts.");
  }
}
