import { EmailQueueService } from "../queue/email-queue.service";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { EmailRetryService } from "../retry/email-retry.service";
import { EmailTrackerService } from "../tracking/email-tracker.service";
import { EmailErrorMapper } from "../errors/email-error-mapper";
import type { EmailProvider } from "../providers/email-provider.interface";

function buildRegistry(provider: EmailProvider): EmailProviderRegistry {
  const registry = new EmailProviderRegistry();
  registry.register(provider);
  registry.setActive(provider.type);
  return registry;
}

function buildProvider(overrides: Partial<EmailProvider> = {}): EmailProvider {
  return {
    type: "CONSOLE",
    enabled: true,
    send: jest.fn().mockResolvedValue({ providerMessageId: "id-1", provider: "CONSOLE" }),
    verifyConnection: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function buildQueue(provider: EmailProvider, maxRetries = 2, retryDelayMs = 50) {
  const tracker = new EmailTrackerService();
  const queue = new EmailQueueService(buildRegistry(provider), new EmailRetryService(), tracker, new EmailErrorMapper(), maxRetries, retryDelayMs);
  return { queue, tracker };
}

const MESSAGE = { to: ["a@example.com"], subject: "Hi", html: "<p>Hi</p>" };

describe("EmailQueueService", () => {
  describe("IMMEDIATE mode", () => {
    it("processes synchronously and returns a COMPLETED item on success", async () => {
      const provider = buildProvider();
      const { queue } = buildQueue(provider);

      const item = await queue.enqueue(MESSAGE, { mode: "IMMEDIATE" });

      expect(item.state).toBe("COMPLETED");
      expect(item.result).toEqual({ providerMessageId: "id-1", provider: "CONSOLE" });
      expect(provider.send).toHaveBeenCalledTimes(1);
    });

    it("defaults to IMMEDIATE mode when no options are given", async () => {
      const { queue } = buildQueue(buildProvider());
      const item = await queue.enqueue(MESSAGE);
      expect(item.mode).toBe("IMMEDIATE");
      expect(item.state).toBe("COMPLETED");
    });

    it("throws (propagating the failure to the caller) when a non-retryable send fails", async () => {
      const provider = buildProvider({ send: jest.fn().mockRejectedValue({ isInvalidRecipient: true, message: "bad recipient" }) });
      const { queue } = buildQueue(provider);

      await expect(queue.enqueue(MESSAGE, { mode: "IMMEDIATE" })).rejects.toMatchObject({ isInvalidRecipient: true });
      expect(provider.send).toHaveBeenCalledTimes(1);
    });

    it("retries a retryable failure up to maxRetries, then throws once exhausted", async () => {
      jest.useFakeTimers();
      const provider = buildProvider({ send: jest.fn().mockRejectedValue({ isProviderUnavailable: true, message: "down" }) });
      const { queue } = buildQueue(provider, 2, 10);

      const promise = queue.enqueue(MESSAGE, { mode: "IMMEDIATE" });
      const assertion = expect(promise).rejects.toMatchObject({ isProviderUnavailable: true });
      await jest.advanceTimersByTimeAsync(1000);
      await assertion;

      expect(provider.send).toHaveBeenCalledTimes(3); // initial + 2 retries
      jest.useRealTimers();
    });

    it("tracks a successful send via EmailTrackerService", async () => {
      const provider = buildProvider();
      const { queue, tracker } = buildQueue(provider);

      await queue.enqueue(MESSAGE, { mode: "IMMEDIATE" });

      expect(tracker.get("id-1")).toMatchObject({ status: "SENT", provider: "CONSOLE" });
    });
  });

  describe("SCHEDULED / DELAYED modes", () => {
    it("returns a PENDING item immediately for DELAYED mode, without sending yet", async () => {
      const provider = buildProvider();
      const { queue } = buildQueue(provider);

      const item = await queue.enqueue(MESSAGE, { mode: "DELAYED", delayMs: 5000 });

      expect(item.state).toBe("PENDING");
      expect(provider.send).not.toHaveBeenCalled();
    });

    it("processes a DELAYED item once its delay elapses", async () => {
      jest.useFakeTimers();
      const provider = buildProvider();
      const { queue } = buildQueue(provider);

      const item = await queue.enqueue(MESSAGE, { mode: "DELAYED", delayMs: 5000 });
      await jest.advanceTimersByTimeAsync(5000);

      expect(queue.getItem(item.id)?.state).toBe("COMPLETED");
      expect(provider.send).toHaveBeenCalledTimes(1);
      jest.useRealTimers();
    });

    it("processes a SCHEDULED item once its scheduledAt time arrives", async () => {
      jest.useFakeTimers();
      const provider = buildProvider();
      const { queue } = buildQueue(provider);
      const scheduledAt = new Date(Date.now() + 10_000);

      const item = await queue.enqueue(MESSAGE, { mode: "SCHEDULED", scheduledAt });
      expect(item.state).toBe("PENDING");
      await jest.advanceTimersByTimeAsync(10_000);

      expect(queue.getItem(item.id)?.state).toBe("COMPLETED");
      jest.useRealTimers();
    });

    it("a deferred processing failure never throws into an unhandled rejection — it's tracked as FAILED instead", async () => {
      jest.useFakeTimers();
      const provider = buildProvider({ send: jest.fn().mockRejectedValue({ isInvalidRecipient: true }) });
      const { queue } = buildQueue(provider);

      const item = await queue.enqueue(MESSAGE, { mode: "DELAYED", delayMs: 1000 });
      await jest.advanceTimersByTimeAsync(1000);
      await Promise.resolve(); // flush the microtask queue after process() rejects internally

      expect(queue.getItem(item.id)?.state).toBe("FAILED");
      jest.useRealTimers();
    });
  });

  describe("cancel / state queries", () => {
    it("cancel() prevents a PENDING scheduled item from ever being processed", async () => {
      jest.useFakeTimers();
      const provider = buildProvider();
      const { queue } = buildQueue(provider);

      const item = await queue.enqueue(MESSAGE, { mode: "DELAYED", delayMs: 5000 });
      const cancelled = queue.cancel(item.id);
      await jest.advanceTimersByTimeAsync(10_000);

      expect(cancelled).toBe(true);
      expect(queue.getItem(item.id)?.state).toBe("CANCELLED");
      expect(provider.send).not.toHaveBeenCalled();
      jest.useRealTimers();
    });

    it("cancel() returns false for an item that isn't PENDING", async () => {
      const { queue } = buildQueue(buildProvider());
      const item = await queue.enqueue(MESSAGE, { mode: "IMMEDIATE" });

      expect(queue.cancel(item.id)).toBe(false);
    });

    it("cancel() returns false for an unknown item id", () => {
      const { queue } = buildQueue(buildProvider());
      expect(queue.cancel("does-not-exist")).toBe(false);
    });

    it("listByState() filters items by their current state", async () => {
      const { queue } = buildQueue(buildProvider());
      await queue.enqueue(MESSAGE, { mode: "IMMEDIATE" });
      await queue.enqueue({ ...MESSAGE, subject: "Second" }, { mode: "DELAYED", delayMs: 60_000 });

      expect(queue.listByState("COMPLETED")).toHaveLength(1);
      expect(queue.listByState("PENDING")).toHaveLength(1);
    });

    it("depth() counts PENDING + PROCESSING items", async () => {
      const { queue } = buildQueue(buildProvider());
      await queue.enqueue(MESSAGE, { mode: "DELAYED", delayMs: 60_000 });
      await queue.enqueue({ ...MESSAGE, subject: "Second" }, { mode: "DELAYED", delayMs: 60_000 });

      expect(queue.depth()).toBe(2);
    });
  });

  it("preserves the caller-supplied correlationId on the queue item", async () => {
    const { queue } = buildQueue(buildProvider());
    const item = await queue.enqueue(MESSAGE, { mode: "IMMEDIATE", correlationId: "user-123" });
    expect(item.correlationId).toBe("user-123");
  });
});
