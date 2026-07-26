/** The "market scoring" capability's unit of record — a single 0..100
 * composite plus the per-dimension components it was built from, so a
 * caller can see WHY the score landed where it did, not just the
 * number. */
export interface MarketScore {
  readonly overall: number;
  readonly components: Readonly<Record<string, number>>;
}
