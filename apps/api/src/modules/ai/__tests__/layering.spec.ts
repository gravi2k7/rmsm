import { readFileSync } from "fs";
import { join } from "path";

/**
 * This phase's own explicit, opening rule, verified structurally
 * rather than just asserted in a comment — the same "read the
 * controller's own source file" discipline every prior REST-layer
 * test in this platform has used since AI-102 Phase 4: "no business
 * module should ever directly call OpenAI, Claude, Gemini, Ollama,
 * etc. — everything goes through the AI Gateway."
 */
describe("Architecture rule — the controller never imports a concrete provider or the provider registry directly", () => {
  it("ai-gateway.controller.ts imports nothing from providers/ or registry/", () => {
    const source = readFileSync(join(__dirname, "..", "controllers", "ai-gateway.controller.ts"), "utf-8");
    expect(source).not.toMatch(/from ["']\.\.\/providers/);
    expect(source).not.toMatch(/from ["']\.\.\/registry/);
  });

  it("ai-gateway.controller.ts's only real dependency on ai/ business logic is AiGatewayService itself", () => {
    const source = readFileSync(join(__dirname, "..", "controllers", "ai-gateway.controller.ts"), "utf-8");
    const gatewayImports = [...source.matchAll(/from ["'](\.\.\/gateway\/[^"']+)["']/g)];
    expect(gatewayImports).toHaveLength(1);
    expect(gatewayImports[0]![1]).toBe("../gateway/ai-gateway.service");
  });
});
