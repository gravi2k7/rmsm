export interface WatchlistItem {
  readonly symbolCode: string;
  readonly reason: string;
  readonly addedAt: Date;
}

export interface Watchlist {
  readonly id: string;
  readonly name: string;
  readonly items: readonly WatchlistItem[];
}
