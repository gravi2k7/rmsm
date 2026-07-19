/**
 * Execution order/fill prices use the exact same value object as
 * `@rmsm/market`'s own `Price` (immutable, precision-aware, non-negative)
 * — an execution price and a market quote price are the same kind of
 * thing, and this domain's own "Common Rules" explicitly say to depend
 * on `@rmsm/market` where appropriate. Re-exporting rather than defining
 * a second, structurally-identical `Price` class here avoids duplicating
 * that logic (and its own rounding/comparison behavior) while still
 * giving this package its own `value-objects/price.ts` module, per the
 * requested file structure.
 */
export { Price } from "@rmsm/market";
