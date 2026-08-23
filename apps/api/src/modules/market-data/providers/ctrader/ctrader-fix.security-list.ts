import {
  CTRADER_FIX_SOH,
  CTRADER_FIX_TAGS,
} from "./ctrader-fix.constants";

import type {
  CTraderFixFields,
  CTraderInstrumentCatalog,
  CTraderInstrumentCatalogEntry,
} from "./ctrader-fix.types";

const SOH = CTRADER_FIX_SOH;

function firstField(
  fields: CTraderFixFields,
  tag: number,
): string | undefined {
  return fields.find((field) => field.tag === tag)?.value;
}

/**
 * Parse one cTrader FIX SecurityListResponse (35=y).
 *
 * cTrader returns the instrument catalog as repeating related-symbol
 * groups. The first field of each group is 55 (Symbol). The provider's
 * numeric instrument identifier is carried by the corresponding
 * security-list instrument field.
 *
 * This parser deliberately does not touch the live quote/snapshot path.
 */
export function parseCTraderSecurityList(
  fields: CTraderFixFields,
): CTraderInstrumentCatalog {
  const requestId = firstField(fields, CTRADER_FIX_TAGS.MD_REQ_ID) ?? "";

  const instruments: CTraderInstrumentCatalogEntry[] = [];

  let currentInstrumentId: string | undefined;
  let currentSymbol: string | undefined;
  let currentDigits: number | null = null;

  const flush = () => {
    if (!currentSymbol || !currentInstrumentId) {
      return;
    }

    instruments.push({
      providerInstrumentId: currentInstrumentId,
      providerSymbol: currentSymbol,
      name: currentSymbol,
      digits: currentDigits,
    });
  };

  for (const field of fields) {
    switch (field.tag) {
      /*
       * cTrader Security List:
       *
       * 55 = Symbol
       *
       * cTrader uses this Spotware-provided numeric identifier as the
       * provider instrument identity. The value is NOT the human-readable
       * symbol name returned by 1007.
       */
      case CTRADER_FIX_TAGS.SYMBOL:
        flush();

        currentInstrumentId = field.value;
        currentSymbol = undefined;
        currentDigits = null;
        break;

      /*
       * 1007 = SymbolName.
       *
       * This is the human-readable/provider symbol representation.
       */
      case 1007:
        currentSymbol = field.value;
        break;

      /*
       * 1008 = SymbolDigits.
       */
      case 1008: {
        const value = Number(field.value);

        if (Number.isInteger(value) && value >= 0) {
          currentDigits = value;
        }

        break;
      }

      default:
        break;
    }
  }

  flush();

  return {
    requestId,
    instruments,
    receivedAt: new Date(),
  };
}

/**
 * Parse raw FIX Security List text.
 *
 * Kept separate from the socket framing code so the parser can be
 * tested with captured production messages.
 */
export function parseCTraderSecurityListRaw(
  raw: string,
): CTraderInstrumentCatalog {
  const fields: Array<{ tag: number; value: string }> = [];

  for (const field of raw.split(SOH)) {
    const separator = field.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const tag = Number(field.slice(0, separator));

    if (!Number.isInteger(tag)) {
      continue;
    }

    fields.push({
      tag,
      value: field.slice(separator + 1),
    });
  }

  return parseCTraderSecurityList(fields);
}
