import { describe, it, expect } from "vitest";
import { loadFilesystemPromptRegistry } from "../load-filesystem-registry";

describe("loadFilesystemPromptRegistry", () => {
  it("returns a PromptRegistry populated with every shipped seed template", async () => {
    const registry = await loadFilesystemPromptRegistry();
    expect(registry.exists("system.platform-safety.v1")).toBe(true);
    expect(registry.exists("chat.customer-support.v1")).toBe(true);
    expect(registry.getByName("chat.customer-support").version).toBe("1.0.0");
  });
});
