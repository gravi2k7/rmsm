import { EmailAdminService } from "../admin/email-admin.service";
import { EmailProviderRegistry } from "../providers/email-provider.registry";
import { TemplateRegistry } from "../template-engine/template-registry";
import { TemplateRenderer } from "../template-engine/template-renderer";
import { TemplateEngine } from "../template-engine/template-engine";
import type { EmailProvider } from "../providers/email-provider.interface";

function buildProvider(overrides: Partial<EmailProvider> = {}): EmailProvider {
  return {
    type: "SMTP",
    enabled: true,
    send: jest.fn().mockResolvedValue({ providerMessageId: "test-1", provider: "SMTP" }),
    verifyConnection: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
}

function buildAdmin(provider: EmailProvider) {
  const registry = new EmailProviderRegistry();
  registry.register(provider);
  registry.setActive(provider.type);
  const templates = new TemplateRegistry();
  const renderer = new TemplateRenderer(new TemplateEngine());
  return new EmailAdminService(registry, templates, renderer);
}

describe("EmailAdminService", () => {
  it("sendTestEmail() sends a test message via the active provider", async () => {
    const provider = buildProvider();
    const admin = buildAdmin(provider);

    const result = await admin.sendTestEmail("qa@example.com");

    expect(result).toEqual({ providerMessageId: "test-1", provider: "SMTP" });
    expect(provider.send).toHaveBeenCalledWith(expect.objectContaining({ to: ["qa@example.com"], subject: expect.stringContaining("Test Email") }));
  });

  it("previewTemplate() renders a named template using its own sample variables", () => {
    const admin = buildAdmin(buildProvider());

    const rendered = admin.previewTemplate("welcome");

    expect(rendered.subject).toContain("Welcome");
    expect(rendered.html.length).toBeGreaterThan(0);
  });

  it("previewTemplate() allows overriding individual sample variables", () => {
    const admin = buildAdmin(buildProvider());

    const rendered = admin.previewTemplate("welcome", { name: "Override Name" });

    expect(rendered.subject).toContain("Override Name");
  });

  it("validateConfiguration() reports no issues when the active provider is enabled and reachable", async () => {
    const admin = buildAdmin(buildProvider());

    const result = await admin.validateConfiguration();

    expect(result).toEqual({ provider: "SMTP", enabled: true, connectionOk: true, issues: [] });
  });

  it("validateConfiguration() flags a provider that is registered but not enabled", async () => {
    const admin = buildAdmin(buildProvider({ enabled: false }));

    const result = await admin.validateConfiguration();

    expect(result.enabled).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it("validateConfiguration() flags an enabled provider whose connection check fails", async () => {
    const admin = buildAdmin(buildProvider({ verifyConnection: jest.fn().mockResolvedValue(false) }));

    const result = await admin.validateConfiguration();

    expect(result.connectionOk).toBe(false);
    expect(result.issues.some((i) => i.includes("connection check failed"))).toBe(true);
  });
});
