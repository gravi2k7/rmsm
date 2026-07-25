/** One language's full set of localized strings, keyed by a stable
 * lookup key (`"greeting.hello"`) — the unit `LocalizationService`
 * registers and resolves against. */
export interface LocaleBundle {
  readonly language: string;
  readonly entries: Readonly<Record<string, string>>;
}
