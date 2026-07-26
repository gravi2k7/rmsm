import type { SignalQualityAssessment } from "./signal-quality-assessment.entity";

export interface SignalIntelligenceReport {
  readonly opportunityId: string;
  readonly assessment: SignalQualityAssessment;
  readonly narrative: string;
  readonly generatedAt: Date;
}
