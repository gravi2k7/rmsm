import { EnterpriseEmailService } from "../enterprise-email.service";
import { EmailQueueService } from "../queue/email-queue.service";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { EmailRetryService } from "../retry/email-retry.service";
import { EmailTrackerService } from "../tracking/email-tracker.service";
import { EmailErrorMapper } from "../errors/email-error-mapper";
import { TemplateEngine } from "../template-engine/template-engine";
import { TemplateRenderer } from "../template-engine/template-renderer";
import { TemplateRegistry } from "../template-engine/template-registry";
import type { EmailProvider } from "../providers/email-provider.interface";

function buildProvider(overrides: Partial<EmailProvider> = {}): EmailProvider {
  return {
    type: "CONSOLE",
    enabled: true,
    send: jest.fn().mockResolvedValue({ providerMessageId: "id-1", provider: "CONSOLE" }),
    verifyConnection: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function buildService(provider: EmailProvider) {
  const registry = new EmailProviderRegistry();
  registry.register(provider);
  registry.setActive(provider.type);
  const queue = new EmailQueueService(registry, new EmailRetryService(), new EmailTrackerService(), new EmailErrorMapper(), 2, 10);
  const renderer = new TemplateRenderer(new TemplateEngine());
  const templates = new TemplateRegistry();
  return new EnterpriseEmailService(queue, renderer, templates);
}

describe("EnterpriseEmailService", () => {
  it("send() preserves the frozen EmailMessage {to, subject, html} -> Promise<void> contract", async () => {
    const provider = buildProvider();
    const service = buildService(provider);

    await expect(service.send({ to: "user@example.com", subject: "Hi", html: "<p>Hi</p>" })).resolves.toBeUndefined();

    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ to: ["user@example.com"], subject: "Hi", html: "<p>Hi</p>" }));
  });

  it("send() throws when the active provider genuinely fails to deliver (no non-retryable-failure regression for console mode)", async () => {
    const provider = buildProvider({ send: jest.fn().mockRejectedValue({ isInvalidRecipient: true, message: "bad recipient" }) });
    const service = buildService(provider);

    await expect(service.send({ to: "bad@", subject: "Hi", html: "<p>Hi</p>" })).rejects.toMatchObject({ isInvalidRecipient: true });
  });

  it("sendEnterprise() supports cc/bcc/attachments the narrow EmailMessage type cannot carry", async () => {
    const provider = buildProvider();
    const service = buildService(provider);

    const item = await service.sendEnterprise({
      to: ["a@example.com"],
      cc: ["b@example.com"],
      subject: "Hi",
      html: "<p>Hi</p>",
      attachments: [{ fileName: "report.pdf", mimeType: "application/pdf", content: "YmFzZTY0" }],
    });

    expect(item.state).toBe("COMPLETED");
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ cc: ["b@example.com"] }));
  });

  it("sendTemplate() renders a named template and enqueues the rendered result", async () => {
    const provider = buildProvider();
    const service = buildService(provider);

    const item = await service.sendTemplate({ templateId: "welcome", to: ["user@example.com"], variables: { name: "Jordan" } });

    expect(item.state).toBe("COMPLETED");
    const sentMessage = (provider.send as jest.Mock).mock.calls[0][0];
    expect(sentMessage.subject).toContain("Welcome");
    expect(sentMessage.html).toContain("Jordan");
  });
});
