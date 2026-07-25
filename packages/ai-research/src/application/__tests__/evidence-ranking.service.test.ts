import { describe, it, expect } from "vitest";
import { EvidenceRankingService } from "../services/evidence-ranking.service";
import { NoEvidenceFoundError } from "../../domain/errors/research-domain.errors";
import type { Evidence } from "../../domain/entities/evidence.entity";

describe("EvidenceRankingService", () => {
  const ranker = new EvidenceRankingService();
  const evidence: readonly Evidence[] = [
    { id: "e1", stepId: "s1", source: { id: "src1", title: "A" }, excerpt: "low", relevanceScore: 0.2 },
    { id: "e2", stepId: "s1", source: { id: "src2", title: "B" }, excerpt: "high", relevanceScore: 0.9 },
  ];

  it("ranks evidence by relevanceScore descending", () => {
    const ranked = ranker.rank(evidence);
    expect(ranked.map((e) => e.id)).toEqual(["e2", "e1"]);
  });

  it("returns an empty array from rank() for empty input", () => {
    expect(ranker.rank([])).toEqual([]);
  });

  it("topN limits the ranked result", () => {
    expect(ranker.topN(evidence, 1).map((e) => e.id)).toEqual(["e2"]);
  });

  it("requireRanked throws NoEvidenceFoundError for empty input", () => {
    expect(() => ranker.requireRanked([], "step1")).toThrow(NoEvidenceFoundError);
  });
});
