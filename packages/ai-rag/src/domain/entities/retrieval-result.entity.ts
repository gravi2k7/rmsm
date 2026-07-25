import type { RetrievableChunk } from "./retrievable-chunk.entity";

export interface RetrievalResult {
  readonly chunk: RetrievableChunk;
  readonly score: number;
}
