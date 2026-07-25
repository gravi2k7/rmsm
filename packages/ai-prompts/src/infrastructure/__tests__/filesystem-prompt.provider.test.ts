import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { FilesystemPromptProvider } from "../filesystem-prompt.provider";
import { InvalidPromptError } from "../../domain/errors/prompt-domain.errors";

async function writeTemplateFile(root: string, category: string, fileName: string, content: unknown): Promise<void> {
  const dir = join(root, category);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, fileName), JSON.stringify(content), "utf-8");
}

const validTemplate = {
  id: "chat.fixture.v1",
  name: "chat.fixture",
  description: "A fixture template.",
  version: "1.0.0",
  type: "CHAT",
  template: "Hi {{name}}.",
  variables: [{ name: "name", required: true }],
  metadata: {
    id: "chat.fixture.v1",
    name: "chat.fixture",
    description: "A fixture template.",
    tags: ["fixture"],
    providerCompatibility: [],
    author: "test-suite",
    version: "1.0.0",
  },
};

describe("FilesystemPromptProvider (fixture directory)", () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "ai-prompts-test-"));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("loads a valid template from a category folder", async () => {
    await writeTemplateFile(root, "chat", "fixture.json", validTemplate);
    const provider = new FilesystemPromptProvider(root);
    const all = await provider.findAll();
    expect(all).toHaveLength(1);
    expect(all[0]?.id).toBe("chat.fixture.v1");
  });

  it("returns an empty list when no category folders exist yet", async () => {
    const provider = new FilesystemPromptProvider(root);
    expect(await provider.findAll()).toEqual([]);
  });

  it("ignores non-.json files in a category folder", async () => {
    await mkdir(join(root, "chat"), { recursive: true });
    await writeFile(join(root, "chat", "README.md"), "not a template", "utf-8");
    const provider = new FilesystemPromptProvider(root);
    expect(await provider.findAll()).toEqual([]);
  });

  it("throws InvalidPromptError for a file that isn't valid JSON", async () => {
    await mkdir(join(root, "chat"), { recursive: true });
    await writeFile(join(root, "chat", "broken.json"), "{ not json", "utf-8");
    const provider = new FilesystemPromptProvider(root);
    await expect(provider.findAll()).rejects.toThrow(InvalidPromptError);
  });

  it("throws InvalidPromptError for JSON that fails schema validation", async () => {
    await writeTemplateFile(root, "chat", "invalid.json", { id: "missing-fields" });
    const provider = new FilesystemPromptProvider(root);
    await expect(provider.findAll()).rejects.toThrow(InvalidPromptError);
  });

  it("findById finds a template across categories, and returns null when absent", async () => {
    await writeTemplateFile(root, "chat", "fixture.json", validTemplate);
    const provider = new FilesystemPromptProvider(root);
    expect((await provider.findById("chat.fixture.v1"))?.id).toBe("chat.fixture.v1");
    expect(await provider.findById("nope")).toBeNull();
  });

  it("findByName resolves the latest version when version is omitted, and a specific one otherwise", async () => {
    await writeTemplateFile(root, "chat", "v1.json", validTemplate);
    await writeTemplateFile(root, "chat", "v2.json", {
      ...validTemplate,
      id: "chat.fixture.v2",
      version: "2.0.0",
      metadata: { ...validTemplate.metadata, id: "chat.fixture.v2", version: "2.0.0" },
    });
    const provider = new FilesystemPromptProvider(root);
    expect((await provider.findByName("chat.fixture"))?.version).toBe("2.0.0");
    expect((await provider.findByName("chat.fixture", "1.0.0"))?.version).toBe("1.0.0");
    expect(await provider.findByName("chat.fixture", "9.9.9")).toBeNull();
  });

  it("exists reflects whether a template id is loadable", async () => {
    await writeTemplateFile(root, "chat", "fixture.json", validTemplate);
    const provider = new FilesystemPromptProvider(root);
    expect(await provider.exists("chat.fixture.v1")).toBe(true);
    expect(await provider.exists("nope")).toBe(false);
  });
});

describe("FilesystemPromptProvider (default templates/ directory shipped with the package)", () => {
  it("loads every seed template across all six category folders", async () => {
    const provider = new FilesystemPromptProvider();
    const all = await provider.findAll();
    const categories = new Set(all.map((t) => t.type));
    expect(all.length).toBeGreaterThanOrEqual(6);
    expect(categories.size).toBeGreaterThanOrEqual(5);
  });

  it("every shipped template is itself structurally valid", async () => {
    const { validateTemplate } = await import("../../application/validation/prompt-validator");
    const provider = new FilesystemPromptProvider();
    const all = await provider.findAll();
    for (const template of all) {
      expect(validateTemplate(template)).toEqual([]);
    }
  });
});
