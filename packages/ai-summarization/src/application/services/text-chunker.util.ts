import { InvalidSummarizationOptionsError } from "../../domain/errors/summarization-domain.errors";

/** A small, local, char-based splitter — deliberately not
 * `@rmsm/ai-documents`' `DocumentChunker` (that one is a
 * document-structure concern with page tracking this package doesn't
 * need): just enough chunking logic to feed `RecursiveSummarizer`/
 * `HierarchicalSummarizer`, kept private to this package. */
export function splitIntoChunks(text: string, maxChunkChars: number): readonly string[] {
  if (maxChunkChars <= 0) {
    throw new InvalidSummarizationOptionsError("maxChunkChars must be positive");
  }
  const chunks: string[] = [];
  for (let start = 0; start < text.length; start += maxChunkChars) {
    chunks.push(text.slice(start, start + maxChunkChars));
  }
  return chunks;
}
