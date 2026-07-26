import type { ResearchPlanner, EvidenceCollector, ResearchReportBuilder } from "@rmsm/ai-research";
import type { ResearchAssistanceResult } from "../../domain/entities/research-assistance-result.entity";

export interface ResearchAssistanceDeps {
  readonly planner: ResearchPlanner;
  readonly evidenceCollector: EvidenceCollector;
  readonly reportBuilder: ResearchReportBuilder;
}

/**
 * Genuine, real (not mocked) reuse of AI-303's own `ResearchPlanner` →
 * `EvidenceCollector` → `ResearchReportBuilder` pipeline — this service
 * never plans, collects evidence, ranks, or summarizes itself; it only
 * sequences three real AI-303 calls into one copilot-facing result.
 */
export class ResearchAssistanceService {
  async research(deps: ResearchAssistanceDeps, topic: string, subQueries: readonly string[]): Promise<ResearchAssistanceResult> {
    const plan = await deps.planner.createPlan(topic, subQueries);
    const evidence = await deps.evidenceCollector.collectForPlan(plan.id);
    const report = await deps.reportBuilder.build(plan.id, evidence);

    return { topic, reportNarrative: report.summary, citationCount: report.citations.length };
  }
}
