import { describe, expect, it } from "vitest";
import { DuplicateWatchlistItemError, WatchlistItemNotFoundError, EmptyArticleTextError } from "../errors/news-intelligence-domain.errors";

describe("news-intelligence domain errors", () => {
  it("DuplicateWatchlistItemError carries the DUPLICATE_WATCHLIST_ITEM code", () => {
    expect(new DuplicateWatchlistItemError("EURUSD").code).toBe("DUPLICATE_WATCHLIST_ITEM");
  });

  it("WatchlistItemNotFoundError carries the WATCHLIST_ITEM_NOT_FOUND code", () => {
    expect(new WatchlistItemNotFoundError("EURUSD").code).toBe("WATCHLIST_ITEM_NOT_FOUND");
  });

  it("EmptyArticleTextError carries the EMPTY_ARTICLE_TEXT code", () => {
    expect(new EmptyArticleTextError().code).toBe("EMPTY_ARTICLE_TEXT");
  });
});
