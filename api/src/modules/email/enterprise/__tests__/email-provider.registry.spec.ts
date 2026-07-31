import { EmailProviderRegistry } from "../providers/email-provider.registry";
import type { EmailProvider } from "../providers/email-provider.interface";

function buildProvider(type: "CONSOLE" | "SMTP" | "RESEND", enabled = true): EmailProvider {
  return {
    type,
    enabled,
    send: jest.fn().mockResolvedValue({ providerMessageId: "id-1", provider: type }),
    verifyConnection: jest.fn().mockResolvedValue(true),
  };
}

describe("EmailProviderRegistry", () => {
  it("register() + get() round-trips a provider by type", () => {
    const registry = new EmailProviderRegistry();
    const provider = buildProvider("SMTP");

    registry.register(provider);

    expect(registry.get("SMTP")).toBe(provider);
  });

  it("get() throws for an unregistered provider type", () => {
    const registry = new EmailProviderRegistry();
    expect(() => registry.get("SMTP")).toThrow(/not registered/);
  });

  it("tryGet() returns null instead of throwing when nothing is registered", () => {
    const registry = new EmailProviderRegistry();
    expect(registry.tryGet("RESEND")).toBeNull();
  });

  it("setActive()/getActive() supports exactly one active provider at a time", () => {
    const registry = new EmailProviderRegistry();
    const console_ = buildProvider("CONSOLE");
    const smtp = buildProvider("SMTP");
    registry.register(console_);
    registry.register(smtp);

    registry.setActive("SMTP");
    expect(registry.getActive()).toBe(smtp);

    registry.setActive("CONSOLE");
    expect(registry.getActive()).toBe(console_);
  });

  it("setActive() throws when activating an unregistered provider", () => {
    const registry = new EmailProviderRegistry();
    expect(() => registry.setActive("RESEND")).toThrow(/not registered/);
  });

  it("getActive() throws when no provider has been activated yet", () => {
    const registry = new EmailProviderRegistry();
    registry.register(buildProvider("CONSOLE"));
    expect(() => registry.getActive()).toThrow(/No active email provider/);
  });

  it("listRegistered() lists every registered provider type, regardless of which is active", () => {
    const registry = new EmailProviderRegistry();
    registry.register(buildProvider("CONSOLE"));
    registry.register(buildProvider("SMTP"));
    registry.register(buildProvider("RESEND"));

    expect(registry.listRegistered().sort()).toEqual(["CONSOLE", "RESEND", "SMTP"]);
  });
});
