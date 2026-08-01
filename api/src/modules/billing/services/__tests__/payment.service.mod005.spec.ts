import { PaymentService } from "../payment.service";
import type { PaymentRepository } from "../../repositories/payment.repository";
import type { AuditService } from "../../../auth/services/audit.service";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { Payment } from "@rmsm/database";

function fakePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: "pay-1",
    organizationId: "org-1",
    provider: "MOCK",
    providerTransactionId: "txn-1",
    amountCents: 1000,
    currency: "USD",
    status: "PENDING",
    createdAt: new Date(),
    ...overrides,
  } as Payment;
}

describe("PaymentService (Module 005 event wiring)", () => {
  let paymentRepository: jest.Mocked<PaymentRepository>;
  let audit: jest.Mocked<AuditService>;
  let publisher: jest.Mocked<DomainEventPublisher>;
  let service: PaymentService;

  beforeEach(() => {
    paymentRepository = {
      findByProviderTransaction: jest.fn(),
      create: jest.fn(),
      updateStatus: jest.fn(),
      findByOrganization: jest.fn(),
      countByOrganization: jest.fn(),
    } as unknown as jest.Mocked<PaymentRepository>;
    audit = { log: jest.fn() } as unknown as jest.Mocked<AuditService>;
    publisher = { publish: jest.fn(), on: jest.fn(), off: jest.fn() } as unknown as jest.Mocked<DomainEventPublisher>;
    service = new PaymentService(paymentRepository, audit, publisher);
  });

  it("recordPayment publishes PaymentSucceeded when created with status SUCCESS", async () => {
    paymentRepository.findByProviderTransaction.mockResolvedValue(null);
    paymentRepository.create.mockResolvedValue(fakePayment({ status: "SUCCESS" }));

    await service.recordPayment({
      organizationId: "org-1",
      provider: "MOCK",
      providerTransactionId: "txn-1",
      amountCents: 1000,
      currency: "USD",
      status: "SUCCESS",
    });

    expect(publisher.publish).toHaveBeenCalledWith("PaymentSucceeded", expect.objectContaining({ paymentId: "pay-1" }));
  });

  it("recordPayment publishes PaymentFailed when created with status FAILED", async () => {
    paymentRepository.findByProviderTransaction.mockResolvedValue(null);
    paymentRepository.create.mockResolvedValue(fakePayment({ status: "FAILED" }));

    await service.recordPayment({
      organizationId: "org-1",
      provider: "MOCK",
      providerTransactionId: "txn-2",
      amountCents: 500,
      currency: "USD",
      status: "FAILED",
    });

    expect(publisher.publish).toHaveBeenCalledWith("PaymentFailed", expect.objectContaining({ paymentId: "pay-1" }));
  });

  it("recordPayment is idempotent — an existing transaction is returned without re-publishing", async () => {
    paymentRepository.findByProviderTransaction.mockResolvedValue(fakePayment({ status: "SUCCESS" }));

    await service.recordPayment({
      organizationId: "org-1",
      provider: "MOCK",
      providerTransactionId: "txn-1",
      amountCents: 1000,
      currency: "USD",
      status: "SUCCESS",
    });

    expect(paymentRepository.create).not.toHaveBeenCalled();
    expect(publisher.publish).not.toHaveBeenCalled();
  });

  it("updateStatus publishes PaymentSucceeded/PaymentFailed based on the new status", async () => {
    paymentRepository.updateStatus.mockResolvedValue(fakePayment({ status: "SUCCESS" }));
    await service.updateStatus("pay-1", "SUCCESS");
    expect(publisher.publish).toHaveBeenCalledWith("PaymentSucceeded", expect.objectContaining({ paymentId: "pay-1" }));
  });
});
