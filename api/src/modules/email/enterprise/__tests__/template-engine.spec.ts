import { TemplateEngine } from "../template-engine/template-engine";

describe("TemplateEngine", () => {
  const engine = new TemplateEngine();

  describe("variables", () => {
    it("substitutes {{var}} references", () => {
      expect(engine.render("Hello {{name}}!", { name: "Jordan" })).toBe("Hello Jordan!");
    });

    it("substitutes multiple distinct variables", () => {
      expect(engine.render("{{greeting}}, {{name}}.", { greeting: "Hi", name: "Alex" })).toBe("Hi, Alex.");
    });

    it("renders an empty string for a missing variable", () => {
      expect(engine.render("Hello {{name}}!", {})).toBe("Hello !");
    });

    it("stringifies number and boolean variables", () => {
      expect(engine.render("{{count}} / {{active}}", { count: 5, active: true })).toBe("5 / true");
    });

    it("HTML-escapes values when escapeHtml is true", () => {
      expect(engine.render("{{name}}", { name: "<script>" }, { escapeHtml: true })).toBe("&lt;script&gt;");
    });

    it("does not escape values when escapeHtml is false (default)", () => {
      expect(engine.render("{{name}}", { name: "<b>bold</b>" })).toBe("<b>bold</b>");
    });
  });

  describe("conditionals", () => {
    it("keeps the block when the variable is truthy", () => {
      expect(engine.render("A{{#if show}}B{{/if}}C", { show: true })).toBe("ABC");
    });

    it("removes the block when the variable is falsy", () => {
      expect(engine.render("A{{#if show}}B{{/if}}C", { show: false })).toBe("AC");
    });

    it("removes the block when the variable is absent", () => {
      expect(engine.render("A{{#if show}}B{{/if}}C", {})).toBe("AC");
    });

    it('treats the literal string "false" as falsy', () => {
      expect(engine.render("A{{#if show}}B{{/if}}C", { show: "false" })).toBe("AC");
    });

    it("treats a non-empty string as truthy", () => {
      expect(engine.render("A{{#if ipAddress}}B{{/if}}C", { ipAddress: "203.0.113.4" })).toBe("ABC");
    });

    it("treats the number 0 as falsy and any other number as truthy", () => {
      expect(engine.render("{{#if n}}yes{{/if}}", { n: 0 })).toBe("");
      expect(engine.render("{{#if n}}yes{{/if}}", { n: 1 })).toBe("yes");
    });

    it("renders variables inside a conditional block", () => {
      expect(engine.render("{{#if show}}Hi {{name}}{{/if}}", { show: true, name: "Jordan" })).toBe("Hi Jordan");
    });
  });

  describe("partials", () => {
    it("substitutes {{> partialName}} with the named partial's content", () => {
      expect(engine.render("Header {{> footer}} Done", {}, { partials: { footer: "FOOTER-CONTENT" } })).toBe("Header FOOTER-CONTENT Done");
    });

    it("renders an unknown partial as empty rather than throwing", () => {
      expect(engine.render("A{{> missing}}B", {}, { partials: {} })).toBe("AB");
    });

    it("renders variables that live inside a partial's own content", () => {
      const result = engine.render("{{> greeting}}", { name: "Jordan" }, { partials: { greeting: "Hi {{name}}" } });
      expect(result).toBe("Hi Jordan");
    });
  });
});
