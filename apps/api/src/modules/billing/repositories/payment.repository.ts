import { Injectable } from "@nestjs/common";
import { prisma, Payment, PaymentStatus, PaymentProviderType, PaymentMethod, DbClient, Prisma } from "@rmsm/database";

export interface CreatePaymentInput {
  organizationId: string;
  invoiceId?: string;
  provider: PaymentProviderType;
  providerTransactionId?: string;
  amountCents: number;
  currency?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  metadata?: Record<string, unknown>;
}

export interface PageParams {
  take: number;
  skip: number;
}

function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

@Injectable()
export class PaymentRepository {
  create(data: CreatePaymentInput, client: DbClient = prisma): Promise<Payment> {
    return client.payment.create({
      data: {
        organizationId: data.organizationId,
        invoiceId: data.invoiceId,
        provider: data.provider,
        providerTransactionId: data.providerTransactionId,
        amountCents: data.amountCents,
        currency: data.currency,
        status: data.status,
        method: data.method,
        metadata: data.metadata !== undefined ? toInputJsonValue(data.metadata) : undefined,
      },
    });
  }

  findById(id: string, client: DbClient = prisma): Promise<Payment | null> {
    return client.payment.findUnique({ where: { id } });
  }

  /** Webhook processing's primary lookup — "have we already recorded this provider transaction," the idempotency check for payment events. */
  findByProviderTransaction(
    provider: PaymentProviderType,
    providerTransactionId: string,
    client: DbClient = prisma,
  ): Promise<Payment | null> {
    return client.payment.findUnique({
      where: { provider_providerTransactionId: { provider, providerTransactionId } },
    });
  }

  findByOrganization(organizationId: string, page: PageParams, client: DbClient = prisma): Promise<Payment[]> {
    return client.payment.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: page.take,
      skip: page.skip,
    });
  }

  countByOrganization(organizationId: string, client: DbClient = prisma): Promise<number> {
    return client.payment.count({ where: { organizationId } });
  }

  updateStatus(id: string, status: PaymentStatus, client: DbClient = prisma): Promise<Payment> {
    return client.payment.update({ where: { id }, data: { status } });
  }
}
