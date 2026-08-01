import { WebhookService } from "../webhook.service";
import type { NotificationWebhookRepository } from "../../repositories/notification-webhook.repository";
import type { CredentialEncryptionService } from "../../providers/shared/credential-encryption";
import type { DomainEventPublisher } from "../../../../common/events/domain-event-publisher.service";
import type { NotificationWebhook } from "@rmsm/database";
import type { Queue } from "bullmq";

jest.mock("../../providers/shared/ssrf-guard", () => ({ assertSafeWebhookUrl: jest.fn().mockResolvedValue(undefined) }));

function fakeWebhook(overrides: Partial<NotificationWebhook> = {}): NotificationWebhook {
  return {
    id: "hook-1",
    organizationId: "org-1",
    url: "https://example.com/webhook",
    secretEnc: "enc-secret",
    eventTypes: ["SubscriptionCreated"],
    isActive: true,
    lastTriggeredAt: null,
    lastStatus: null,
    createdById: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as NotificationWebhook;
}

describe("WebhookService (outbound)", () => {
  let webhookRepository: jest.Mocked<NotificationWebhookRepository>;
  let encryption: jest.Mocked<CredentialEncryptionService>;
  let eventPublisher: jest.Mocked<DomainEventPublisher>;
  let retryQueue: jest.Mocked<Queue>;
  let service: WebhookService;
  const originalFetch = global.fetch;

  beforeEach(() => {
    webhookRepository = {
      findActiveByOrganization: jest.fn(),
      findById: jest.fn(),
      updateLastTriggered: jest.fn(),
    } as unknown as jest.Mocked<NotificationWebhookRepository>;
    encryption = {
      decrypt: jest.fn().mockReturnValue({ secret: "shh" }),
    } as unknown as jest.Mocked<CredentialEncryptionService>;
    eventPublisher = { publish: jest.fn(), on: jest.fn(), off: jest.fn() } as unknown as jest.Mocked<DomainEventPublisher>;
    retryQueue = { add: jest.fn() } as unknown as jest.Mocked<Queue>;
    service = new WebhookService(webhookRepository, encryption, eventPublisher, retryQueue);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it("publishes WebhookDelivered and marks success on a 200 response", async () => {
    webhookRepository.findActiveByOrganization.mockResolvedValue([fakeWebhook()]);
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;

    await service.triggerForEvent("org-1", "SubscriptionCreated", { subscriptionId: "sub-1" });

    expect(webhookRepository.updateLastTriggered).toHaveBeenCalledWith("hook-1", "success");
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      "WebhookDelivered",
      expect.objectContaining({ webhookId: "hook-1", organizationId: "org-1" }),
    );
    expect(retryQueue.add).not.toHaveBeenCalled();
  });

  it("publishes WebhookFailed and schedules a retry job on a non-2xx response", async () => {
    webhookRepository.findActiveByOrganization.mockResolvedValue([fakeWebhook()]);
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as unknown as typeof fetch;

    await service.triggerForEvent("org-1", "SubscriptionCreated", { subscriptionId: "sub-1" });

    expect(webhookRepository.updateLastTriggered).toHaveBeenCalledWith("hook-1", "failed_500");
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      "WebhookFailed",
      expect.objectContaining({ webhookId: "hook-1", reason: "HTTP 500" }),
    );
    expect(retryQueue.add).toHaveBeenCalledWith(
      "retry-webhook",
      expect.objectContaining({ webhookId: "hook-1" }),
      expect.objectContaining({ attempts: 3 }),
    );
  });

  it("publishes WebhookFailed and schedules a retry on a network error", async () => {
    webhookRepository.findActiveByOrganization.mockResolvedValue([fakeWebhook()]);
    global.fetch = jest.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    await service.triggerForEvent("org-1", "SubscriptionCreated", {});

    expect(webhookRepository.updateLastTriggered).toHaveBeenCalledWith("hook-1", "failed_network_error");
    expect(eventPublisher.publish).toHaveBeenCalledWith("WebhookFailed", expect.objectContaining({ reason: "ECONNREFUSED" }));
    expect(retryQueue.add).toHaveBeenCalled();
  });

  it("retryDelivery re-fetches the webhook and publishes WebhookDelivered on success", async () => {
    webhookRepository.findById.mockResolvedValue(fakeWebhook());
    global.fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 }) as unknown as typeof fetch;

    await service.retryDelivery("hook-1", "SubscriptionCreated", { subscriptionId: "sub-1" });

    expect(webhookRepository.updateLastTriggered).toHaveBeenCalledWith("hook-1", "success_after_retry");
    expect(eventPublisher.publish).toHaveBeenCalledWith(
      "WebhookDelivered",
      expect.objectContaining({ webhookId: "hook-1", retried: true }),
    );
  });

  it("retryDelivery throws (letting BullMQ retry again) when the retry attempt still fails", async () => {
    webhookRepository.findById.mockResolvedValue(fakeWebhook());
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 }) as unknown as typeof fetch;

    await expect(service.retryDelivery("hook-1", "SubscriptionCreated", {})).rejects.toThrow(/503/);
  });

  it("retryDelivery is a no-op when the webhook no longer exists", async () => {
    webhookRepository.findById.mockResolvedValue(null);
    global.fetch = jest.fn();

    await service.retryDelivery("gone", "SubscriptionCreated", {});

    expect(global.fetch).not.toHaveBeenCalled();
  });
});
