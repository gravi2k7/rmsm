import { DomainError } from "@rmsm/core";

export class DuplicateWatchlistItemError extends DomainError {
  constructor(symbolCode: string) {
    super(`"${symbolCode}" is already on this watchlist.`, "DUPLICATE_WATCHLIST_ITEM");
  }
}

export class WatchlistItemNotFoundError extends DomainError {
  constructor(symbolCode: string) {
    super(`"${symbolCode}" is not on this watchlist.`, "WATCHLIST_ITEM_NOT_FOUND");
  }
}

export class EmptyArticleTextError extends DomainError {
  constructor() {
    super("Article headline and body must not both be empty.", "EMPTY_ARTICLE_TEXT");
  }
}
