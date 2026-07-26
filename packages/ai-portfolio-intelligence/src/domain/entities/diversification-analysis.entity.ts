import type { DiversificationLevel } from "../enums/portfolio-intelligence.enum";

export interface DiversificationAnalysis {
  readonly portfolioId: string;
  readonly level: DiversificationLevel;
  /** Herfindahl-Hirschman Index over symbol weights (0..1); higher means more concentrated. */
  readonly herfindahlIndex: number;
  readonly reason: string;
}
