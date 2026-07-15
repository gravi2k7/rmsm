import { randomUUID } from "crypto";
import type { IndicatorInstance as IndicatorInstanceContract } from "../contracts/indicator-instance.interface";
import type { IndicatorDefinition } from "../contracts/indicator-definition.interface";
import type { ParameterValue } from "../contracts/parameter-definition.interface";

/**
 * Real, mutable implementation of `contracts/indicator-instance.interface.ts`
 * — this phase's own "additional architectural improvement": definitions
 * are immutable templates, instances are the mutable runtime
 * configuration layered on top. Not a NestJS `@Injectable()` — an
 * instance is a plain runtime VALUE (like `new Date()`), created on
 * demand by whatever future service manages a user's indicator
 * instances (Phase 2B+), not a singleton service the DI container
 * manages.
 */
export class IndicatorInstance implements IndicatorInstanceContract {
  readonly instanceId: string;
  readonly definitionIdentifier: string;
  readonly definitionVersion: string;
  private _parameters: Record<string, ParameterValue>;

  constructor(definition: IndicatorDefinition, parameterOverrides: Partial<Record<string, ParameterValue>> = {}, instanceId?: string) {
    this.instanceId = instanceId ?? randomUUID();
    this.definitionIdentifier = definition.identifier;
    this.definitionVersion = definition.version;
    // Starts as a copy of the definition's defaults — a genuine copy,
    // not a reference into the frozen definition object, so mutating
    // this instance's parameters can never accidentally attempt to
    // write through to (and throw against) the definition's own frozen
    // defaultParameters.
    this._parameters = this.mergeDefined(definition.defaultParameters, parameterOverrides);
  }

  get parameters(): Readonly<Record<string, ParameterValue>> {
    return this._parameters;
  }

  updateParameters(overrides: Partial<Record<string, ParameterValue>>): void {
    this._parameters = this.mergeDefined(this._parameters, overrides);
  }

  /** `Partial<Record<...>>` allows an explicit `undefined` value per key (TypeScript's own definition of Partial) — stripped out here so the stored `_parameters` (typed as a plain, non-optional Record) never actually contains one, which a naive object spread would otherwise silently allow through. */
  private mergeDefined(base: Record<string, ParameterValue>, overrides: Partial<Record<string, ParameterValue>>): Record<string, ParameterValue> {
    const merged: Record<string, ParameterValue> = { ...base };
    for (const [key, value] of Object.entries(overrides)) {
      if (value !== undefined) merged[key] = value;
    }
    return merged;
  }
}
