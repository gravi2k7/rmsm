export interface ExposureAnalysisResult {
  readonly portfolioId: string;
  readonly scope: string;
  readonly scopeId?: string;
  readonly percentage: number;
  readonly limitPercentage: number;
  readonly withinLimit: boolean;
}
