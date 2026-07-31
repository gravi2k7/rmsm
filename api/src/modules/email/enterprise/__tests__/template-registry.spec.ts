import { TemplateRegistry } from "../template-engine/template-registry";
import { EMAIL_TEMPLATE_IDS } from "../constants/email-platform.constants";
import type { EmailTemplateId } from "../contracts/email-platform.contracts";

describe("TemplateRegistry", () => {
  const registry = new TemplateRegistry();

  it("registers all 26 named templates from EM-001's own Templates section", () => {
    expect(registry.listAll()).toHaveLength(26);
    expect(EMAIL_TEMPLATE_IDS).toHaveLength(26);
  });

  it.each(EMAIL_TEMPLATE_IDS)("resolves template id %s via get()", (id) => {
    const definition = registry.get(id as EmailTemplateId);
    expect(definition.id).toBe(id);
    expect(definition.subject.length).toBeGreaterThan(0);
    expect(definition.body.length).toBeGreaterThan(0);
  });

  it("every template declares sampleVariables usable for preview rendering", () => {
    for (const definition of registry.listAll()) {
      expect(definition.sampleVariables).toBeDefined();
    }
  });

  it("groups templates into the 7 named categories", () => {
    const categories = new Set(registry.listAll().map((t) => t.category));
    expect(categories).toEqual(new Set(["Authentication", "Organization", "Security", "Billing", "AI Platform", "Portfolio", "System"]));
  });

  it("tryGet() returns null for an unregistered id rather than throwing", () => {
    expect(registry.tryGet("not-a-real-id" as EmailTemplateId)).toBeNull();
  });

  it("get() throws a clear error for an unregistered id", () => {
    expect(() => registry.get("not-a-real-id" as EmailTemplateId)).toThrow(/No email template registered/);
  });
});
