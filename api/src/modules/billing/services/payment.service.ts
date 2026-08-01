import { Injectable } from "@nestjs/common";
import { Payment, PaymentProviderType, PaymentStatus } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { MOD005_EVENTS } from "../../../common/events/mod005-events";
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
    private readonly eventPublisher: DomainEventPublisher,
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

    if (payment.status === "SUCCESS") {
      await this.eventPublisher.publish(MOD005_EVENTS.PAYMENT_SUCCEEDED, {
        paymentId: payment.id,
        organizationId: payment.organizationId,
        amountCents: payment.amountCents,
      });
    } else if (payment.status === "FAILED") {
      await this.eventPublisher.publish(MOD005_EVENTS.PAYMENT_FAILED, {
        paymentId: payment.id,
        organizationId: payment.organizationId,
        amountCents: payment.amountCents,
      });
    }

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

    if (status === "SUCCESS") {
      await this.eventPublisher.publish(MOD005_EVENTS.PAYMENT_SUCCEEDED, {
        paymentId: updated.id,
        organizationId: updated.organizationId,
        amountCents: updated.amountCents,
      });
    } else if (status === "FAILED") {
      await this.eventPublisher.publish(MOD005_EVENTS.PAYMENT_FAILED, {
        paymentId: updated.id,
        organizationId: updated.organizationId,
        amountCents: updated.amountCents,
      });
    }

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
