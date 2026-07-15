import { Injectable } from "@nestjs/common";
import { NotFoundError } from "@rmsm/shared";
import type { IndicatorDefinition } from "../contracts/indicator-definition.interface";
import type { IndicatorRegistry as IndicatorRegistryContract } from "../contracts/indicator-registry.interface";
import type { IndicatorCategory } from "../contracts/indicator-category.enum";
import { RegistryValidatorService } from "./registry-validator.service";

/**
 * Real implementation of `contracts/indicator-registry.interface.ts` —
 * the first real (non-contract-only) code in AI-102, matching the exact
 * "no computation, metadata only" scope this phase draws. Backed by a
 * two-level `Map<identifier, Map<version, IndicatorDefinition>>` —
 * version management (item 1, item 7) is structural, not bolted on:
 * multiple versions of the same identifier coexist by construction,
 * never overwriting each other.
 *
 * **Immutability, enforced structurally, not by convention**: every
 * `IndicatorDefinition` is `Object.freeze()`-d (recursively, including
 * its nested `metadata`/`inputs`/`outputs`/`defaultParameters` objects)
 * before being stored — "Definitions must be immutable" (this phase's
 * own architecture rule) is a runtime guarantee here, not just a
 * TypeScript `readonly` hint a caller could still bypass with a type
 * assertion.
 */
@Injectable()
export class IndicatorRegistryService implements IndicatorRegistryContract {
  private readonly definitions = new Map<string, Map<string, IndicatorDefinition>>();

  constructor(private readonly validator: RegistryValidatorService) {}

  register(definition: IndicatorDefinition): void {
    this.validator.validate(definition, this);

    const frozen = this.deepFreeze(definition);
    let versions = this.definitions.get(definition.identifier);
    if (!versions) {
      versions = new Map<string, IndicatorDefinition>();
      this.definitions.set(definition.identifier, versions);
    }
    versions.set(definition.version, frozen);
  }

  get(identifier: string): IndicatorDefinition {
    const definition = this.tryGet(identifier);
    if (!definition) {
      throw new NotFoundError("IndicatorDefinition", identifier);
    }
    return definition;
  }

  tryGet(identifier: string): IndicatorDefinition | null {
    const versions = this.definitions.get(identifier);
    if (!versions || versions.size === 0) return null;
    return this.latestVersionOf(versions);
  }

  getVersion(identifier: string, version: string): IndicatorDefinition {
    const versions = this.definitions.get(identifier);
    const definition = versions?.get(version);
    if (!definition) {
      throw new NotFoundError("IndicatorDefinition", `${identifier}@${version}`);
    }
    return definition;
  }

  listVersions(identifier: string): IndicatorDefinition[] {
    const versions = this.definitions.get(identifier);
    if (!versions) return [];
    return [...versions.values()].sort((a, b) => this.compareSemver(a.version, b.version));
  }

  listByCategory(category: IndicatorCategory): IndicatorDefinition[] {
    return this.listAll().filter((d) => d.category === category);
  }

  listByTag(tag: string): IndicatorDefinition[] {
    return this.listAll().filter((d) => d.tags.includes(tag));
  }

  /** Latest version of every registered identifier — not every version of every identifier (that's `listVersions()`, called per-identifier). */
  listAll(): IndicatorDefinition[] {
    return [...this.definitions.values()].map((versions) => this.latestVersionOf(versions));
  }

  private latestVersionOf(versions: Map<string, IndicatorDefinition>): IndicatorDefinition {
    const sorted = [...versions.values()].sort((a, b) => this.compareSemver(a.version, b.version));
    const latest = sorted[sorted.length - 1];
    if (!latest) throw new Error("Unreachable: a registered identifier has zero versions."); // versions.size === 0 is checked by every caller before reaching here
    return latest;
  }

  /** A real, if minimal, semver comparator — major.minor.patch, numeric comparison per segment, not a lexicographic string sort (which would incorrectly order "10.0.0" before "9.0.0"). Does not handle pre-release/build-metadata suffixes (e.g. "1.0.0-beta.1") — every indicator version registered this phase is a plain three-segment release version, and a fuller semver parser is a real, named follow-up if a pre-release version is ever actually needed, not implemented speculatively now. */
  private compareSemver(a: string, b: string): number {
    const partsA = a.split(".").map(Number);
    const partsB = b.split(".").map(Number);
    for (let i = 0; i < 3; i++) {
      const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
      if (diff !== 0) return diff;
    }
    return 0;
  }

  private deepFreeze<T>(value: T): T {
    if (value === null || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value as Record<string, unknown>).forEach((v) => this.deepFreeze(v));
    return Object.freeze(value);
  }
}
