export interface CopilotSessionSummary {
  readonly sessionId: string;
  readonly turnCount: number;
  readonly narrative: string;
  readonly generatedAt: Date;
}
