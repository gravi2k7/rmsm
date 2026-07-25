import { describe, it, expect } from "vitest";
import { PromptCompiler } from "../compiler/prompt-compiler";
import { InvalidPromptError, PromptValidationError } from "../../domain/errors/prompt-domain.errors";
import { PromptType } from "../../domain/enums/prompt-type.enum";
import type { PromptTemplate } from "../../domain/entities/prompt-template.entity";

function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  return {
    id: "role.trader.v1",
    name: "role.trader",
    description: "Trader role fragment.",
    version: "1.0.0",
    type: PromptType.SYSTEM,
    template: "You act as a {{persona}} trading assistant.",
    variables: [{ name: "persona", required: true }],
    metadata: {
      id: "role.trader.v1",
      name: "role.trader",
      description: "Trader role fragment.",
      tags: ["role"],
      providerCompatibility: [],
      author: "test-suite",
      version: "1.0.0",
    },
    ...overrides,
  };
}

describe("PromptCompiler.compile", () => {
  it("composes system + safety + role + context + task fragments into one systemPrompt, in that order", () => {
    const compiler = new PromptCompiler();
    const result = compiler.compile({
      systemPrompt: "You are RMSM's AI assistant.",
      safetyPrompt: "Never give financial advice as fact.",
      rolePrompt: "You act as a {{persona}} trading assistant.",
      contextPrompt: "The user's organization is {{org}}.",
      taskPrompt: "Answer the user's question about market data.",
      userPrompt: "What is a moving average?",
      variables: { persona: "senior", org: "Acme Capital" },
    });

    const lines = result.systemPrompt.split("\n\n");
    expect(lines).toEqual([
      "You are RMSM's AI assistant.",
      "Never give financial advice as fact.",
      "You act as a senior trading assistant.",
      "The user's organization is Acme Capital.",
      "Answer the user's question about market data.",
    ]);
    expect(result.userPrompt).toBe("What is a moving average?");
  });

  it("skips undefined fragment slots without leaving blank separators", () => {
    const compiler = new PromptCompiler();
    const result = compiler.compile({
      systemPrompt: "You are RMSM's AI assistant.",
      userPrompt: "Hello.",
    });
    expect(result.systemPrompt).toBe("You are RMSM's AI assistant.");
  });

  it("accepts a registered PromptTemplate as a fragment, renders it, and folds its metadata in", () => {
    const compiler = new PromptCompiler();
    const roleTemplate = makeTemplate();
    const result = compiler.compile({
      rolePrompt: roleTemplate,
      userPrompt: "Hi.",
      variables: { persona: "cautious" },
    });
    expect(result.systemPrompt).toBe("You act as a cautious trading assistant.");
    expect(result.metadata).toHaveLength(1);
    expect(result.metadata[0]?.id).toBe("role.trader.v1");
  });

  it("propagates PromptValidationError when a template fragment is structurally invalid", () => {
    const compiler = new PromptCompiler();
    const broken = makeTemplate({ template: "" });
    expect(() => compiler.compile({ rolePrompt: broken, userPrompt: "Hi." })).toThrow(PromptValidationError);
  });

  it("throws InvalidPromptError when every fragment renders to blank content", () => {
    const compiler = new PromptCompiler();
    expect(() => compiler.compile({ userPrompt: "   " })).toThrow(InvalidPromptError);
  });

  it("returns the effective variables actually used across all fragments, including applied defaults", () => {
    const compiler = new PromptCompiler();
    const result = compiler.compile({
      rolePrompt: "Persona: {{persona}}",
      userPrompt: "Question: {{question}}",
      variables: { persona: "senior", question: "What is RSI?" },
    });
    expect(result.variables).toEqual({ persona: "senior", question: "What is RSI?" });
  });
});

describe("PromptCompiler.compileTemplate", () => {
  it("compiles a SYSTEM-typed template into the systemPrompt slot", () => {
    const compiler = new PromptCompiler();
    const result = compiler.compileTemplate(makeTemplate(), { persona: "senior" });
    expect(result.systemPrompt).toBe("You act as a senior trading assistant.");
    expect(result.userPrompt).toBe("");
  });

  it("compiles a non-SYSTEM-typed template into the userPrompt slot", () => {
    const compiler = new PromptCompiler();
    const chatTemplate = makeTemplate({ type: PromptType.CHAT, template: "Summarize: {{persona}}" });
    const result = compiler.compileTemplate(chatTemplate, { persona: "senior" });
    expect(result.systemPrompt).toBe("");
    expect(result.userPrompt).toBe("Summarize: senior");
  });
});
