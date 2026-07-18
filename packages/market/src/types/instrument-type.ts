/**
 * How an instrument is traded — orthogonal to `AssetClass` (e.g. an
 * equity `AssetClass` might be traded as a `SHARE` or as a `CFD` on the
 * same underlying; a `FOREX` pair is always `SPOT` or a `FUTURE`).
 */
export type InstrumentType = "SPOT" | "FUTURE" | "OPTION" | "CFD" | "PERPETUAL" | "SHARE" | "FUND";

export const INSTRUMENT_TYPES: readonly InstrumentType[] = ["SPOT", "FUTURE", "OPTION", "CFD", "PERPETUAL", "SHARE", "FUND"];
