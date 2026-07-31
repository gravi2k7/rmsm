import { TemplateEngine } from "../template-engine/template-engine";
import { TemplateRenderer } from "../template-engine/template-renderer";
import type { TemplateDefinition } from "../template-engine/template-definition";

function buildRenderer(): TemplateRenderer {
  return new TemplateRenderer(new TemplateEngine());
}

describe("TemplateRenderer", () => {
  it("renders subject, html, and a derived plain-text alternative for an HTML template", () => {
    const definition: TemplateDefinition = {
      id: "welcome",
      category: "Authentication",
      format: "html",
      subject: "Welcome, {{name}}",
      body: "<p>Hi {{name}}, welcome aboard.</p>",
      sampleVariables: { name: "Jordan" },
    };

    const rendered = buildRenderer().render(definition, { name: "Jordan" });

    expect(rendered.subject).toBe("Welcome, Jordan");
    expect(rendered.html).toContain("<p>Hi Jordan, welcome aboard.</p>");
    expect(rendered.html).toContain("<!DOCTYPE html>");
    expect(rendered.html).toContain("<title>Welcome, Jordan</title>");
    expect(rendered.text).toContain("Hi Jordan, welcome aboard.");
    expect(rendered.text).not.toContain("<p>");
  });

  it("uses an explicit textBody when the definition provides one, instead of deriving it", () => {
    const definition: TemplateDefinition = {
      id: "welcome",
      category: "Authentication",
      format: "html",
      subject: "Welcome",
      body: "<p>Hi {{name}}</p>",
      textBody: "Hi {{name}} (plain text version)",
      sampleVariables: { name: "Jordan" },
    };

    const rendered = buildRenderer().render(definition, { name: "Jordan" });

    expect(rendered.text).toBe("Hi Jordan (plain text version)");
  });

  it("converts a markdown-format template's body to HTML", () => {
    const definition: TemplateDefinition = {
      id: "general-notification",
      category: "System",
      format: "markdown",
      subject: "Update",
      body: "**Important**: {{message}}",
      sampleVariables: { message: "Hello" },
    };

    const rendered = buildRenderer().render(definition, { message: "Hello" });

    expect(rendered.html).toContain("<strong>Important</strong>: Hello");
  });

  it("wraps every rendered body inside the shared base layout with a footer", () => {
    const definition: TemplateDefinition = {
      id: "welcome",
      category: "Authentication",
      format: "html",
      subject: "Hi",
      body: "<p>Body</p>",
      sampleVariables: {},
    };

    const rendered = buildRenderer().render(definition, {});

    expect(rendered.html).toContain("RMSM");
    expect(rendered.html).toContain("You're receiving this email because you have an RMSM account.");
  });

  it("resolves shared partials (e.g. {{> button}}) referenced from a template body", () => {
    const definition: TemplateDefinition = {
      id: "verify-email",
      category: "Authentication",
      format: "html",
      subject: "Verify",
      body: "<p>Click below</p>{{> button}}",
      sampleVariables: { actionUrl: "https://app.rmsm.ai/verify", actionLabel: "Verify Email" },
    };

    const rendered = buildRenderer().render(definition, { actionUrl: "https://app.rmsm.ai/verify", actionLabel: "Verify Email" });

    expect(rendered.html).toContain("https://app.rmsm.ai/verify");
    expect(rendered.html).toContain("Verify Email");
  });

  it("HTML-escapes subject-derived content in the <title> tag even though the subject variable itself may render unescaped in the body", () => {
    const definition: TemplateDefinition = {
      id: "general-notification",
      category: "System",
      format: "html",
      subject: "<b>Alert</b>",
      body: "<p>{{message}}</p>",
      sampleVariables: { message: "hi" },
    };

    const rendered = buildRenderer().render(definition, { message: "hi" });

    expect(rendered.html).toContain("<title>&lt;b&gt;Alert&lt;/b&gt;</title>");
  });
});
