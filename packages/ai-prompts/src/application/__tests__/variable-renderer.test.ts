import { describe, it, expect } from "vitest";
import { extractVariableNames, findMalformedPlaceholders, renderTemplate, resolveEffectiveVariables } from "../rendering/variable-renderer";
import { MissingVariableError } from "../../domain/errors/prompt-domain.errors";

describe("extractVariableNames", () => {
  it("finds every distinct {{name}} placeholder, deduplicated, in first-seen order", () => {
    expect(extractVariableNames("Hello {{name}}, welcome to {{org}}. Bye {{name}}.")).toEqual(["name", "org"]);
  });

  it("returns an empty array for a template with no placeholders", () => {
    expect(extractVariableNames("Hello there.")).toEqual([]);
  });

  it("tolerates whitespace inside braces", () => {
    expect(extractVariableNames("{{  name  }}")).toEqual(["name"]);
  });
});

describe("findMalformedPlaceholders", () => {
  it("returns nothing for well-formed placeholders", () => {
    expect(findMalformedPlaceholders("Hello {{name}}, from {{org}}.")).toEqual([]);
  });

  it("flags an empty placeholder", () => {
    expect(findMalformedPlaceholders("Hello {{}}")).toEqual(["{{}}"]);
  });

  it("flags a placeholder whose name starts with a digit", () => {
    expect(findMalformedPlaceholders("Hello {{1name}}")).toEqual(["{{1name}}"]);
  });

  it("flags unbalanced/unclosed braces", () => {
    expect(findMalformedPlaceholders("Hello {{name")).toEqual(["{{"]);
    expect(findMalformedPlaceholders("Hello name}}")).toEqual(["}}"]);
  });
});

describe("renderTemplate", () => {
  it("substitutes a single placeholder — the spec's own example", () => {
    expect(renderTemplate({ templateId: "t1", template: "Hello {{name}}", variables: { name: "Ravi" } })).toBe("Hello Ravi");
  });

  it("substitutes multiple placeholders and repeated occurrences of the same one", () => {
    const result = renderTemplate({
      templateId: "t1",
      template: "{{name}}, meet {{name}} from {{org}}.",
      variables: { name: "Ravi", org: "RMSM" },
    });
    expect(result).toBe("Ravi, meet Ravi from RMSM.");
  });

  it("throws MissingVariableError naming every unresolved variable when no value or default exists — the spec's own {{organization}} example", () => {
    expect(() => renderTemplate({ templateId: "t1", template: "Hello {{organization}}", variables: {} })).toThrow(MissingVariableError);
    try {
      renderTemplate({ templateId: "t1", template: "{{a}} and {{b}}", variables: {} });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(MissingVariableError);
      expect((error as MissingVariableError).context.variableNames).toEqual(["a", "b"]);
    }
  });

  it("falls back to a declared variable's defaultValue when no explicit value is supplied", () => {
    const result = renderTemplate({
      templateId: "t1",
      template: "Tone: {{tone}}",
      variables: {},
      declaredVariables: [{ name: "tone", required: false, defaultValue: "neutral" }],
    });
    expect(result).toBe("Tone: neutral");
  });

  it("an explicit value overrides a declared default", () => {
    const result = renderTemplate({
      templateId: "t1",
      template: "Tone: {{tone}}",
      variables: { tone: "formal" },
      declaredVariables: [{ name: "tone", required: false, defaultValue: "neutral" }],
    });
    expect(result).toBe("Tone: formal");
  });
});

describe("resolveEffectiveVariables", () => {
  it("returns only the variables actually referenced by the template", () => {
    const effective = resolveEffectiveVariables({
      templateId: "t1",
      template: "Hello {{name}}",
      variables: { name: "Ravi", unused: "ignored" },
    });
    expect(effective).toEqual({ name: "Ravi" });
  });
});
