import { Injectable } from "@nestjs/common";
import { Payment, PaymentProviderType, PaymentStatus } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { PaymentRepository, CreatePaymentInput, PageParams } from "../repositories/payment.repository";

/**
 * Owns Payment records — creating them (idempotently, keyed on
 * [provider, providerTransactionId]) and reading them. Does not decide
 * *when* a payment should be recorded — that's WebhookService (driven by
 * provider events) or a direct API call for a manually-recorded payment.
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Idempotent: if a payment with this [provider, providerTransactionId]
   * already exists, returns it unchanged rather than creating a duplicate
   * — the same at-least-once-delivery concern webhook events always carry.
   */
  async recordPayment(input: CreatePaymentInput, actorId?: string, ctx: AuditContext = {}): Promise<Payment> {
    if (input.providerTransactionId) {
      const existing = await this.paymentRepository.findByProviderTransaction(
        input.provider,
        input.providerTransactionId,
      );
      if (existing) return existing;
    }

    const payment = await this.paymentRepository.create(input);
    await this.auditService.log("billing.payment.recorded", {
      userId: actorId ?? null,
      entityType: "Payment",
      entityId: payment.id,
      metadata: { organizationId: input.organizationId, provider: input.provider, amountCents: input.amountCents },
      ...ctx,
    });
    return payment;
  }

  async updateStatus(paymentId: string, status: PaymentStatus, ctx: AuditContext = {}): Promise<Payment> {
    const updated = await this.paymentRepository.updateStatus(paymentId, status);
    await this.auditService.log("billing.payment.status_updated", {
      entityType: "Payment",
      entityId: paymentId,
      metadata: { status },
      ...ctx,
    });
    return updated;
  }

  findByProviderTransaction(provider: PaymentProviderType, providerTransactionId: string): Promise<Payment | null> {
    return this.paymentRepository.findByProviderTransaction(provider, providerTransactionId);
  }

  async listPayments(organizationId: string, page: PageParams): Promise<{ items: Payment[]; total: number }> {
    const [items, total] = await Promise.all([
      this.paymentRepository.findByOrganization(organizationId, page),
      this.paymentRepository.countByOrganization(organizationId),
    ]);
    return { items, total };
  }
}
