import type { CopilotIntent } from "../enums/trading-copilot.enum";

export interface CopilotAnswer {
  readonly sessionId: string;
  readonly question: string;
  readonly intent: CopilotIntent;
  readonly answer: string;
  readonly sourceTool: string;
}
