/**
 * An order/fill "quantity" and `@rmsm/market`'s own `Volume` (a
 * non-negative traded/tradable amount) are the same concept under a
 * different name — this domain calls it "quantity" (the conventional
 * order-management term), `@rmsm/market` calls it "volume" (the
 * conventional market-data term). Re-exported under this domain's own
 * name rather than reimplemented, for the same reason `price.ts` in this
 * folder re-exports `@rmsm/market`'s `Price`.
 */
export { Volume as Quantity } from "@rmsm/market";
