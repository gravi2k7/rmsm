/** StrategyCategory is a closed set the domain already models as a plain string union (`StrategyCategory`, `strategy-category.value-object.ts`) — this interface exposes only the DISPLAY metadata a persistence layer might hold for it (name/description/sortOrder for UI), never a "create a new category" operation, since the set itself is closed by the domain's own type, not by database rows. */
export interface StrategyCategoryDisplayInfo {
  code: string;
  displayName: string;
  description: string | null;
  sortOrder: number;
}

export interface CategoryRepository {
  listAll(): Promise<StrategyCategoryDisplayInfo[]>;
}

/** Tags ARE genuinely dynamic (author-defined, item "Strategy Tags" is explicitly an open folksonomy, `strategy-category.value-object.ts`'s own comment) — this repository's `ensureExists` is the real operation a Strategy's own `addTag()` domain method eventually needs persisted. */
export interface TagRepository {
  ensureExists(tagName: string): Promise<void>;
  listAllKnown(): Promise<string[]>;
}
