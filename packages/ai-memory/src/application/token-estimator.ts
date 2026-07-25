/**
 * A rough, provider-independent token estimate — ~4 characters per
 * token, the commonly-cited approximation for English text across most
 * tokenizers. Deliberately NOT a real tokenizer (e.g. tiktoken) —
 * pulling in a specific tokenizer would tie this package to assumptions
 * about a specific provider's encoding, which contradicts "memory must
 * be provider-independent." `ContextAssembler`/`MemoryCompressor` use
 * this consistently so their token-budget behavior is at least
 * internally coherent, even though it won't exactly match any one
 * provider's real count. A future caller that needs an exact count for
 * a specific provider can substitute its own estimate — nothing here
 * assumes this function is authoritative.
 */
export function estimateTokenCount(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4);
}
