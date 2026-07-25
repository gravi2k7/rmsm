export interface SharedContextStore {
  set(key: string, value: unknown, updatedBy: string): Promise<void>;
  get(key: string): Promise<unknown>;
  all(): Promise<Readonly<Record<string, unknown>>>;
}
