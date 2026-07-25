import type { LocaleBundleRepository } from "../repositories/locale-bundle-repository.interface";
import type { LocaleBundle } from "../domain/entities/locale-bundle.entity";

export class InMemoryLocaleBundleRepository implements LocaleBundleRepository {
  private readonly bundles = new Map<string, LocaleBundle>();

  async findByLanguage(language: string): Promise<LocaleBundle | null> {
    return this.bundles.get(language) ?? null;
  }

  async save(bundle: LocaleBundle): Promise<void> {
    this.bundles.set(bundle.language, bundle);
  }
}
