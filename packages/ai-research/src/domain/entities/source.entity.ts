/** One provider-independent reference to where information came from —
 * a URL, a document id, anything a `SearchProvider` returns. Never
 * carries a provider-specific payload shape. */
export interface Source {
  readonly id: string;
  readonly title: string;
  readonly url?: string;
  readonly publishedAt?: Date;
}
