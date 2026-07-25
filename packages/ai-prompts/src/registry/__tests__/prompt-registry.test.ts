import { describe, it, expect, beforeEach } from "vitest";
import { PromptRegistry } from "../prompt-registry";
import { DuplicatePromptError, PromptNotFoundError, PromptVersionNotFoundError } from "../../domain/errors/prompt-domain.errors";
import { PromptValidationError } from "../../domain/errors/prompt-domain.errors";
import { PromptType } from "../../domain/enums/prompt-type.enum";
import type { PromptTemplate } from "../../domain/entities/prompt-template.entity";

function makeTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  const version = overrides.version ?? "1.0.0";
  return {
    id: `chat.greeting.v${version}`,
    name: "chat.greeting",
    description: "Greets the user.",
    version,
    type: PromptType.CHAT,
    template: "Hello {{name}}.",
    variables: [{ name: "name", required: true }],
    metadata: {
      id: `chat.greeting.v${version}`,
      name: "chat.greeting",
      description: "Greets the user.",
      tags: ["greeting"],
      providerCompatibility: [],
      author: "test-suite",
      version,
    },
    ...overrides,
  };
}

describe("PromptRegistry", () => {
  let registry: PromptRegistry;

  beforeEach(() => {
    registry = new PromptRegistry();
  });

  it("registers a template and retrieves it by id", () => {
    const template = makeTemplate();
    registry.register(template, "ravi");
    expect(registry.get(template.id)).toEqual(template);
  });

  it("throws PromptNotFoundError for an unregistered id", () => {
    expect(() => registry.get("does.not.exist")).toThrow(PromptNotFoundError);
  });

  it("rejects a structurally invalid template at registration time", () => {
    const invalid = makeTemplate({ template: "" });
    expect(() => registry.register(invalid, "ravi")).toThrow(PromptValidationError);
  });

  it("rejects re-registering the same id", () => {
    const template = makeTemplate();
    registry.register(template, "ravi");
    expect(() => registry.register(template, "ravi")).toThrow(DuplicatePromptError);
  });

  it("rejects re-registering the same (name, version) pair under a different id", () => {
    const template = makeTemplate();
    registry.register(template, "ravi");
    const clash = makeTemplate({ id: "a-different-id" });
    expect(() => registry.register(clash, "ravi")).toThrow(DuplicatePromptError);
  });

  it("allows the same name at a different version", () => {
    registry.register(makeTemplate({ version: "1.0.0" }), "ravi");
    expect(() => registry.register(makeTemplate({ version: "1.1.0" }), "ravi")).not.toThrow();
  });

  describe("getByName", () => {
    it("resolves to the highest registered version when version is omitted", () => {
      registry.register(makeTemplate({ version: "1.0.0" }), "ravi");
      registry.register(makeTemplate({ version: "2.0.0" }), "ravi");
      registry.register(makeTemplate({ version: "1.5.0" }), "ravi");
      expect(registry.getByName("chat.greeting").version).toBe("2.0.0");
    });

    it("resolves to a specific requested version", () => {
      registry.register(makeTemplate({ version: "1.0.0" }), "ravi");
      registry.register(makeTemplate({ version: "2.0.0" }), "ravi");
      expect(registry.getByName("chat.greeting", "1.0.0").version).toBe("1.0.0");
    });

    it("throws PromptNotFoundError for a name that was never registered", () => {
      expect(() => registry.getByName("nope")).toThrow(PromptNotFoundError);
    });

    it("throws PromptVersionNotFoundError for a known name at an unregistered version", () => {
      registry.register(makeTemplate({ version: "1.0.0" }), "ravi");
      expect(() => registry.getByName("chat.greeting", "9.9.9")).toThrow(PromptVersionNotFoundError);
    });
  });

  describe("exists / existsByName", () => {
    it("reports existence correctly by id and by name", () => {
      const template = makeTemplate();
      expect(registry.exists(template.id)).toBe(false);
      expect(registry.existsByName(template.name)).toBe(false);
      registry.register(template, "ravi");
      expect(registry.exists(template.id)).toBe(true);
      expect(registry.existsByName(template.name)).toBe(true);
      expect(registry.existsByName(template.name, "9.9.9")).toBe(false);
    });
  });

  describe("list", () => {
    it("filters by type and by tag", () => {
      registry.register(makeTemplate({ id: "a", type: PromptType.CHAT, metadata: { ...makeTemplate().metadata, tags: ["x"] } }), "ravi");
      registry.register(
        makeTemplate({ id: "b", name: "other", type: PromptType.CODING, metadata: { ...makeTemplate().metadata, id: "b", name: "other", tags: ["y"] } }),
        "ravi",
      );

      expect(registry.list({ type: PromptType.CODING })).toHaveLength(1);
      expect(registry.list({ tag: "x" })).toHaveLength(1);
      expect(registry.list()).toHaveLength(2);
    });
  });

  describe("versions", () => {
    it("returns the registration-order version history, with author and createdAt", () => {
      registry.register(makeTemplate({ version: "1.0.0" }), "ravi");
      registry.register(makeTemplate({ version: "1.1.0" }), "priya");

      const history = registry.versions("chat.greeting");
      expect(history.map((v) => v.version)).toEqual(["1.0.0", "1.1.0"]);
      expect(history[1]?.author).toBe("priya");
      expect(history[0]?.createdAt).toBeInstanceOf(Date);
    });

    it("throws PromptNotFoundError for a name with no history", () => {
      expect(() => registry.versions("nope")).toThrow(PromptNotFoundError);
    });
  });
});
