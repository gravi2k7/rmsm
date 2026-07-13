import { RmsmTemplateEngine } from "../rmsm-template-engine";

describe("RmsmTemplateEngine", () => {
  let engine: RmsmTemplateEngine;

  beforeEach(() => {
    engine = new RmsmTemplateEngine();
  });

  it("substitutes simple variables", async () => {
    const result = await engine.render("Hello {{name}}!", null, { variables: { name: "Ava" }, locale: "en" });
    expect(result.body).toBe("Hello Ava!");
  });

  it("substitutes nested-path variables", async () => {
    const result = await engine.render("{{user.profile.name}}", null, {
      variables: { user: { profile: { name: "Priya" } } },
      locale: "en",
    });
    expect(result.body).toBe("Priya");
  });

  it("renders {{#if}} truthy branch", async () => {
    const result = await engine.render("{{#if active}}Active{{else}}Inactive{{/if}}", null, {
      variables: { active: true },
      locale: "en",
    });
    expect(result.body).toBe("Active");
  });

  it("renders {{#if}} falsy branch via {{else}}", async () => {
    const result = await engine.render("{{#if active}}Active{{else}}Inactive{{/if}}", null, {
      variables: { active: false },
      locale: "en",
    });
    expect(result.body).toBe("Inactive");
  });

  it("renders {{#if}} with no {{else}} and a falsy condition as empty", async () => {
    const result = await engine.render("{{#if active}}Active{{/if}}", null, {
      variables: { active: false },
      locale: "en",
    });
    expect(result.body).toBe("");
  });

  it("renders {{#each}} over an array of objects", async () => {
    const result = await engine.render("{{#each items}}[{{name}}]{{/each}}", null, {
      variables: { items: [{ name: "a" }, { name: "b" }, { name: "c" }] },
      locale: "en",
    });
    expect(result.body).toBe("[a][b][c]");
  });

  it("renders {{#each}} over an array of primitives using {{this}}", async () => {
    const result = await engine.render("{{#each tags}}#{{this}} {{/each}}", null, {
      variables: { tags: ["a", "b"] },
      locale: "en",
    });
    expect(result.body).toBe("#a #b ");
  });

  it("correctly handles {{#if}} nested inside {{#each}} (matched-depth parsing)", async () => {
    const template = "{{#each users}}{{#if isAdmin}}[ADMIN:{{name}}]{{else}}[USER:{{name}}]{{/if}}{{/each}}";
    const result = await engine.render(template, null, {
      variables: {
        users: [
          { name: "Alice", isAdmin: true },
          { name: "Bob", isAdmin: false },
        ],
      },
      locale: "en",
    });
    expect(result.body).toBe("[ADMIN:Alice][USER:Bob]");
  });

  it("correctly handles {{#each}} nested inside {{#if}} (matched-depth parsing)", async () => {
    const template = "{{#if showList}}{{#each items}}<{{this}}>{{/each}}{{/if}}";
    const result = await engine.render(template, null, {
      variables: { showList: true, items: ["x", "y"] },
      locale: "en",
    });
    expect(result.body).toBe("<x><y>");
  });

  it("does not let an {{else}} inside a nested {{#if}} split the outer block", async () => {
    const template = "{{#if outer}}{{#if inner}}A{{else}}B{{/if}}{{else}}C{{/if}}";
    const result = await engine.render(template, null, {
      variables: { outer: true, inner: false },
      locale: "en",
    });
    expect(result.body).toBe("B");
  });

  it("applies a layout, exposing the rendered template as {{content}}", async () => {
    const result = await engine.render("Body: {{name}}", "<div>{{content}}</div>", {
      variables: { name: "X" },
      locale: "en",
    });
    expect(result.body).toBe("<div>Body: X</div>");
  });

  it("renders missing variables as empty string, not literal undefined", async () => {
    const result = await engine.render("[{{missing}}]", null, { variables: {}, locale: "en" });
    expect(result.body).toBe("[]");
  });

  describe("validateSyntax", () => {
    it("detects mismatched {{#each}}/{{/each}} tags", () => {
      const result = engine.validateSyntax("{{#each items}}no closing tag");
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("accepts well-formed templates", () => {
      const result = engine.validateSyntax("{{#if a}}{{#each b}}{{this}}{{/each}}{{/if}}");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});
