import { describe, it, expect } from "vitest";
import {
  PromptDomainError,
  PromptNotFoundError,
  PromptVersionNotFoundError,
  MissingVariableError,
  PromptValidationError,
  DuplicatePromptError,
  InvalidPromptError,
} from "../errors/prompt-domain.errors";

describe("prompt domain error hierarchy", () => {
  it("every concrete error extends PromptDomainError and carries a stable code", () => {
    const cases: Array<[PromptDomainError, string]> = [
      [new PromptNotFoundError("chat.support"), "PromptNotFound"],
      [new PromptVersionNotFoundError("chat.support", "2.0.0"), "PromptVersionNotFound"],
      [new MissingVariableError("chat.support", ["organization"]), "MissingVariable"],
      [new PromptValidationError("chat.support", ["empty prompt body"]), "PromptValidationError"],
      [new DuplicatePromptError("chat.support"), "DuplicatePrompt"],
      [new InvalidPromptError("unbalanced {{ placeholder"), "InvalidPrompt"],
    ];

    for (const [error, code] of cases) {
      expect(error).toBeInstanceOf(PromptDomainError);
      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBe(code);
      expect(error.name).toBe(error.constructor.name);
    }
  });

  it("MissingVariableError names every missing variable, not just the first", () => {
    const error = new MissingVariableError("chat.support", ["organization", "userName"]);
    expect(error.message).toContain("organization");
    expect(error.message).toContain("userName");
    expect(error.context.variableNames).toEqual(["organization", "userName"]);
  });

  it("PromptValidationError aggregates every issue found", () => {
    const error = new PromptValidationError("chat.support", ["unknown variable: foo", "duplicate variable: bar"]);
    expect(error.context.issues).toHaveLength(2);
  });
});
