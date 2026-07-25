import { PromptRegistry } from "../registry/prompt-registry";
import { FilesystemPromptProvider } from "./filesystem-prompt.provider";

/**
 * The composition-root convenience most consumers actually want: build
 * a `FilesystemPromptProvider` (optionally pointed at a custom
 * `rootDir`, e.g. in a test), load every template it finds, and
 * register them all into a fresh `PromptRegistry` — ready to hand to a
 * `PromptCompiler` call site. `author` is recorded against every
 * template's version history entry; templates loaded this way don't
 * carry their own "who registered this" identity the way a future
 * database-backed registration flow would, so a fixed value
 * ("filesystem") is honest about that.
 */
export async function loadFilesystemPromptRegistry(rootDir?: string): Promise<PromptRegistry> {
  const provider = new FilesystemPromptProvider(rootDir);
  const registry = new PromptRegistry();
  const templates = await provider.findAll();
  for (const template of templates) {
    registry.register(template, "filesystem");
  }
  return registry;
}
