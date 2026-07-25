import type { JsonExtractionProvider } from "../repositories/json-extraction-provider.interface";
import { NoJsonFoundError } from "../domain/errors/extraction-domain.errors";

/**
 * The real, default `JsonExtractionProvider` — finds the first
 * balanced `{...}` or `[...]` substring in the text (bracket-depth
 * matching, aware of quoted strings so braces inside string values
 * don't throw off the count) and `JSON.parse`s it. No LLM dependency;
 * useful for text that already embeds a JSON blob (e.g. a provider
 * response wrapped in prose). A real LLM-driven extractor is a future
 * adapter of this interface.
 */
export class RegexJsonExtractionProvider implements JsonExtractionProvider {
  async extractJson(text: string): Promise<unknown> {
    const candidate = this.findBalancedJson(text);
    if (!candidate) {
      throw new NoJsonFoundError();
    }
    try {
      return JSON.parse(candidate);
    } catch {
      throw new NoJsonFoundError();
    }
  }

  private findBalancedJson(text: string): string | null {
    const openers = new Set(["{", "["]);
    const closers: Record<string, string> = { "{": "}", "[": "]" };

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (!char || !openers.has(char)) continue;

      const expectedCloser = closers[char]!;
      let depth = 0;
      let inString = false;
      let escaped = false;

      for (let j = i; j < text.length; j++) {
        const current = text[j]!;
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (current === "\\") {
            escaped = true;
          } else if (current === '"') {
            inString = false;
          }
          continue;
        }
        if (current === '"') {
          inString = true;
        } else if (current === char) {
          depth += 1;
        } else if (current === expectedCloser) {
          depth -= 1;
          if (depth === 0) {
            return text.slice(i, j + 1);
          }
        }
      }
    }

    return null;
  }
}
