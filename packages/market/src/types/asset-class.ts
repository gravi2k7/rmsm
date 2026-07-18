/** Every asset class this domain models. A `Symbol`/`Instrument` is
 * always exactly one of these — no cross-asset-class instrument exists. */
export type AssetClass = "FOREX" | "FUTURES" | "EQUITY" | "INDEX" | "CRYPTO" | "COMMODITY" | "OPTION" | "BOND" | "ETF";

export const ASSET_CLASSES: readonly AssetClass[] = ["FOREX", "FUTURES", "EQUITY", "INDEX", "CRYPTO", "COMMODITY", "OPTION", "BOND", "ETF"];
