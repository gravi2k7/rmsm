export interface MomentumAnalysis {
  /** Percentage rate of change over the analyzed window. */
  readonly rateOfChange: number;
  /** Whether the most recent half of the window changed faster than the
   * earlier half — a simple acceleration proxy. */
  readonly accelerating: boolean;
}
