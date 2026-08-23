import {
  parseCTraderSecurityList,
  parseCTraderSecurityListRaw,
} from "../ctrader-fix.security-list";

import { CTRADER_FIX_SOH } from "../ctrader-fix.constants";

describe("CTrader FIX Security List parser", () => {
  it("parses a SecurityListResponse into catalog entries", () => {
    const fields = [
      { tag: 35, value: "y" },
      { tag: 262, value: "SECURITY-LIST-001" },

      { tag: 55, value: "1" },
      { tag: 1007, value: "EURUSD" },
      { tag: 1008, value: "5" },

      { tag: 55, value: "2" },
      { tag: 1007, value: "XAUUSD" },
      { tag: 1008, value: "2" },

      { tag: 55, value: "3" },
      { tag: 1007, value: "NAS100" },
      { tag: 1008, value: "1" },
    ];

    const result = parseCTraderSecurityList(fields);

    expect(result.requestId).toBe("SECURITY-LIST-001");
    expect(result.instruments).toHaveLength(3);

    expect(result.instruments[0]).toMatchObject({
      providerInstrumentId: "1",
      providerSymbol: "EURUSD",
      name: "EURUSD",
      digits: 5,
    });

    expect(result.instruments[1]).toMatchObject({
      providerInstrumentId: "2",
      providerSymbol: "XAUUSD",
      name: "XAUUSD",
      digits: 2,
    });

    expect(result.instruments[2]).toMatchObject({
      providerInstrumentId: "3",
      providerSymbol: "NAS100",
      name: "NAS100",
      digits: 1,
    });
  });

  it("flushes the previous instrument when the next 55 field arrives", () => {
    const fields = [
      { tag: 262, value: "REQ-1" },

      { tag: 55, value: "101" },
      { tag: 1007, value: "EURUSD" },

      { tag: 55, value: "102" },
      { tag: 1007, value: "GBPUSD" },
    ];

    const result = parseCTraderSecurityList(fields);

    expect(result.instruments).toEqual([
      {
        providerInstrumentId: "101",
        providerSymbol: "EURUSD",
        name: "EURUSD",
        digits: null,
      },
      {
        providerInstrumentId: "102",
        providerSymbol: "GBPUSD",
        name: "GBPUSD",
        digits: null,
      },
    ]);
  });

  it("ignores an instrument that has no provider symbol", () => {
    const fields = [
      { tag: 262, value: "REQ-2" },

      { tag: 55, value: "201" },

      { tag: 55, value: "202" },
      { tag: 1007, value: "XAUUSD" },
    ];

    const result = parseCTraderSecurityList(fields);

    expect(result.instruments).toEqual([
      {
        providerInstrumentId: "202",
        providerSymbol: "XAUUSD",
        name: "XAUUSD",
        digits: null,
      },
    ]);
  });

  it("ignores invalid digits", () => {
    const fields = [
      { tag: 55, value: "301" },
      { tag: 1007, value: "EURUSD" },
      { tag: 1008, value: "not-a-number" },
    ];

    const result = parseCTraderSecurityList(fields);

    expect(result.instruments[0]).toMatchObject({
      providerInstrumentId: "301",
      providerSymbol: "EURUSD",
      name: "EURUSD",
      digits: null,
    });
  });

  it("parses raw SOH-delimited FIX text", () => {
    const soh = CTRADER_FIX_SOH;

    const raw =
      [
        "8=FIX.4.4",
        "35=y",
        "262=REQ-RAW-1",
        "55=401",
        "1007=EURUSD",
        "1008=5",
      ].join(soh) + soh;

    const result = parseCTraderSecurityListRaw(raw);

    expect(result.requestId).toBe("REQ-RAW-1");
    expect(result.instruments).toEqual([
      {
        providerInstrumentId: "401",
        providerSymbol: "EURUSD",
        name: "EURUSD",
        digits: 5,
      },
    ]);
  });

  it("returns an empty catalog when no instruments are present", () => {
    const result = parseCTraderSecurityList([
      { tag: 35, value: "y" },
      { tag: 262, value: "EMPTY-REQ" },
    ]);

    expect(result.requestId).toBe("EMPTY-REQ");
    expect(result.instruments).toEqual([]);
  });
});
