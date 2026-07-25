/** The renderable form of one piece of `Evidence` — what actually gets
 * printed in a research report's citation list. Kept as its own entity
 * (rather than reusing `Evidence` directly) because a citation is a
 * presentation concern (formatted label + locator) while `Evidence` is
 * a collection-time fact. */
export interface Citation {
  readonly evidenceId: string;
  readonly label: string;
  readonly locator: string;
}
