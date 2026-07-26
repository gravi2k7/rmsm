import type { MarketStructure } from "../enums/market-intelligence.enum";

export interface MarketStructureAnalysis {
  readonly structure: MarketStructure;
  readonly higherHighs: boolean;
  readonly higherLows: boolean;
  readonly lowerHighs: boolean;
  readonly lowerLows: boolean;
}
