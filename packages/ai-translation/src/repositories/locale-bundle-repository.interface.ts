import type { LocaleBundle } from "../domain/entities/locale-bundle.entity";

export interface LocaleBundleRepository {
  findByLanguage(language: string): Promise<LocaleBundle | null>;
  save(bundle: LocaleBundle): Promise<void>;
}
