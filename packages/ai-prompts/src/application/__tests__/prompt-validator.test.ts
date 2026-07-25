import { describe, it, expect } from "vitest";
import { validateTemplate, assertValidTemplate } from "../validation/prompt-validator";
import { PromptValidationError } from "../../domain/errors/prompt-domain.errors";
import { PromptType } from "../../domain/enums/prompt-type.enum";
import type { PromptTemplate } from "../../domain/entities/prompt-template.entity";

function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "test.template.v1",
    name: "test.template",
    description: "A test template.",
    version: "1.0.0",
    type: PromptType.CUSTOM,
    template: "Hello {{name}}, welcome to {{org}}.",
    variables: [
      { name: "name", required: true },
      { name: "org", required: true, defaultValue: "RMSM" },
    ],
    metadata: {
      id: "test.template.v1",
      name: "test.template",
      description: "A test template.",
      tags: [],
      providerCompatibility: [],
      author: "test-suite",
      version: "1.0.0",
    },
    ...overrides,
  };
}

describe("validateTemplate", () => {
  it("returns no issues for a well-formed template", () => {
    expect(validateTemplate(makeTemplate())).toEqual([]);
  });

  it("flags an empty template body", () => {
    const issues = validateTemplate(makeTemplate({ template: "   " }));
    expect(issues.some((i) => i.type === "empty-prompt")).toBe(true);
  });

  it("flags malformed placeholders", () => {
    const issues = validateTemplate(makeTemplate({ template: "Hello {{}}", variables: [] }));
    expect(issues.some((i) => i.type === "malformed-placeholder")).toBe(true);
  });

  it("flags a variable declared more than once", () => {
    const issues = validateTemplate(
      makeTemplate({
        variables: [
          { name: "name", required: true },
          { name: "name", required: false },
          { name: "org", required: true, defaultValue: "RMSM" },
        ],
      }),
    );
    expect(issues.some((i) => i.type === "duplicate-variable")).toBe(true);
  });

  it("flags a variable used in the body but never declared", () => {
    const issues = validateTemplate(makeTemplate({ variables: [{ name: "name", required: true }] }));
    expect(issues.some((i) => i.type === "unknown-variable" && i.message.includes("org"))).toBe(true);
  });

  it("does not flag missing variables when no providedVariables argument is given", () => {
    const issues = validateTemplate(makeTemplate());
    expect(issues.some((i) => i.type === "missing-variable")).toBe(false);
  });

  it("flags a required variable with no default and no provided value", () => {
    const issues = validateTemplate(makeTemplate(), {});
    expect(issues.some((i) => i.type === "missing-variable" && i.message.includes("name"))).toBe(true);
    // "org" has a defaultValue, so it should NOT be flagged even though it's required and unprovided.
    expect(issues.some((i) => i.type === "missing-variable" && i.message.includes("org"))).toBe(false);
  });

  it("does not flag a required variable that IS provided", () => {
    const issues = validateTemplate(makeTemplate(), { name: "Ravi" });
    expect(issues.some((i) => i.type === "missing-variable")).toBe(false);
  });
});

describe("assertValidTemplate", () => {
  it("does not throw for a valid template", () => {
    expect(() => assertValidTemplate(makeTemplate())).not.toThrow();
  });

  it("throws PromptValidationError aggregating every issue for an invalid template", () => {
    const bad = makeTemplate({ template: "", variables: [] });
    expect(() => assertValidTemplate(bad)).toThrow(PromptValidationError);
  });
});
