import { EmailHealthProvider } from "../health/email-health.provider";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { EmailQueueService } from "../queue/email-queue.service";
import { EmailTrackerService } from "../tracking/email-tracker.service";
import type { EmailProvider } from "../providers/email-provider.interface";

function buildProvider(overrides: Partial<EmailProvider> = {}): EmailProvider {
  return { type: "SMTP", enabled: true, send: jest.fn(), verifyConnection: jest.fn().mockResolvedValue(true), ...overrides };
}

function buildRegistry(provider: EmailProvider): EmailProviderRegistry {
  const registry = new EmailProviderRegistry();
  registry.register(provider);
  registry.setActive(provider.type);
  return registry;
}

describe("EmailHealthProvider", () => {
  it("reports healthy when the connection check passes and the queue is quiet", async () => {
    const registry = buildRegistry(buildProvider());
    const queue = { depth: jest.fn().mockReturnValue(0) } as unknown as EmailQueueService;
    const tracker = { recentFailureRate: jest.fn().mockReturnValue(0) } as unknown as EmailTrackerService;
    const health = new EmailHealthProvider(registry, queue, tracker);

    const snapshot = await health.checkHealth();

    expect(snapshot.status).toBe("healthy");
    expect(snapshot.provider).toBe("SMTP");
    expect(snapshot.connectionOk).toBe(true);
    expect(snapshot.lastCheckedAt).toBeInstanceOf(Date);
  });

  it("reports down when the provider's connection check fails", async () => {
    const registry = buildRegistry(buildProvider({ verifyConnection: jest.fn().mockResolvedValue(false) }));
    const queue = { depth: jest.fn().mockReturnValue(0) } as unknown as EmailQueueService;
    const tracker = { recentFailureRate: jest.fn().mockReturnValue(0) } as unknown as EmailTrackerService;
    const health = new EmailHealthProvider(registry, queue, tracker);

    expect((await health.checkHealth()).status).toBe("down");
  });

  it("reports down (never throws) when verifyConnection() itself rejects", async () => {
    const registry = buildRegistry(buildProvider({ verifyConnection: jest.fn().mockRejectedValue(new Error("boom")) }));
    const queue = { depth: jest.fn().mockReturnValue(0) } as unknown as EmailQueueService;
    const tracker = { recentFailureRate: jest.fn().mockReturnValue(0) } as unknown as EmailTrackerService;
    const health = new EmailHealthProvider(registry, queue, tracker);

    await expect(health.checkHealth()).resolves.toMatchObject({ status: "down" });
  });

  it("reports degraded when the queue is deep even though the connection is fine", async () => {
    const registry = buildRegistry(buildProvider());
    const queue = { depth: jest.fn().mockReturnValue(999) } as unknown as EmailQueueService;
    const tracker = { recentFailureRate: jest.fn().mockReturnValue(0) } as unknown as EmailTrackerService;
    const health = new EmailHealthProvider(registry, queue, tracker);

    expect((await health.checkHealth()).status).toBe("degraded");
  });

  it("reports degraded when the recent failure rate is high", async () => {
    const registry = buildRegistry(buildProvider());
    const queue = { depth: jest.fn().mockReturnValue(0) } as unknown as EmailQueueService;
    const tracker = { recentFailureRate: jest.fn().mockReturnValue(0.9) } as unknown as EmailTrackerService;
    const health = new EmailHealthProvider(registry, queue, tracker);

    expect((await health.checkHealth()).status).toBe("degraded");
  });
});
