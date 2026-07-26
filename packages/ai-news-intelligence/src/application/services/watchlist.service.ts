import type { Watchlist, WatchlistItem } from "../../domain/entities/watchlist.entity";
import { DuplicateWatchlistItemError, WatchlistItemNotFoundError } from "../../domain/errors/news-intelligence-domain.errors";

/** Pure, immutable operations over a `Watchlist` — every method returns
 * a new `Watchlist` rather than mutating in place, since this package
 * defines no persistence of its own (a caller owns storage). */
export class WatchlistService {
  create(id: string, name: string): Watchlist {
    return { id, name, items: [] };
  }

  addItem(watchlist: Watchlist, symbolCode: string, reason: string, addedAt: Date = new Date()): Watchlist {
    if (watchlist.items.some((item) => item.symbolCode === symbolCode)) {
      throw new DuplicateWatchlistItemError(symbolCode);
    }
    const item: WatchlistItem = { symbolCode, reason, addedAt };
    return { ...watchlist, items: [...watchlist.items, item] };
  }

  removeItem(watchlist: Watchlist, symbolCode: string): Watchlist {
    if (!watchlist.items.some((item) => item.symbolCode === symbolCode)) {
      throw new WatchlistItemNotFoundError(symbolCode);
    }
    return { ...watchlist, items: watchlist.items.filter((item) => item.symbolCode !== symbolCode) };
  }
}
