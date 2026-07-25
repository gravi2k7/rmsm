import type { SharedContextStore } from "../repositories/shared-context-store.interface";

export class InMemorySharedContextStore implements SharedContextStore {
  private readonly entries = new Map<string, unknown>();

  async set(key: string, value: unknown, _updatedBy: string): Promise<void> {
    this.entries.set(key, value);
  }

  async get(key: string): Promise<unknown> {
    return this.entries.get(key);
  }

  async all(): Promise<Readonly<Record<string, unknown>>> {
    return Object.fromEntries(this.entries.entries());
  }
}
