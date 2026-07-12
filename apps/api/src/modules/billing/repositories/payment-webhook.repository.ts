import { Injectable } from "@nestjs/common";
import { prisma, PaymentWebhook, PaymentProviderType, DbClient, Prisma } from "@rmsm/database";

export interface CreatePaymentWebhookInput {
  provider: PaymentProviderType;
  eventType: string;
  providerEventId: string;
  payload: Record<string, unknown>;
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class PaymentWebhookRepository {
  create(data: CreatePaymentWebhookInput, client: DbClient = prisma): Promise<PaymentWebhook> {
    return client.paymentWebhook.create({
      data: {
        provider: data.provider,
        eventType: data.eventType,
        providerEventId: data.providerEventId,
        payload: toInputJsonValue(data.payload),
      },
    });
  }

  /** The idempotency check (ADR-015) — WebhookService calls this before processing any event. */
  findByProviderEventId(providerEventId: string, client: DbClient = prisma): Promise<PaymentWebhook | null> {
    return client.paymentWebhook.findUnique({ where: { providerEventId } });
  }

  markProcessed(id: string, client: DbClient = prisma): Promise<PaymentWebhook> {
    return client.paymentWebhook.update({
      where: { id },
      data: { status: "PROCESSED", processedAt: new Date() },
    });
  }

  markFailed(id: string, client: DbClient = prisma): Promise<PaymentWebhook> {
    return client.paymentWebhook.update({ where: { id }, data: { status: "FAILED" } });
  }
}
