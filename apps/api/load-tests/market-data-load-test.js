// k6 load test for AI-101's REST layer — a real, complete script, in the
// same spirit as Module 005's notifications-load-test.js. Requires the
// k6 binary (https://k6.io/docs/get-started/installation/), a running
// instance of this API, and a valid JWT for a test user with
// market-data.read (any tier — see seed.ts, granted broadly).
//
// NOT executed in this sandbox — there is no live instance of this API,
// no seeded database, and no running Postgres/Redis to load-test
// against. Written and reviewed for correctness against k6's real API
// and this module's real endpoint shapes; the numbers it would produce
// are unverified here, and presenting them as measured would be
// dishonest. Run it against a real deployed instance per this header.
//
// Run: k6 run --env BASE_URL=http://localhost:3000 --env JWT=... --env EXCHANGE_ID=... --env INSTRUMENT_ID=... --env INSTRUMENT_SYMBOL=... market-data-load-test.js

import http from "k6/http";
import { check, sleep } from "k6";
import { Rate, Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const JWT = __ENV.JWT;
const EXCHANGE_ID = __ENV.EXCHANGE_ID;
const INSTRUMENT_ID = __ENV.INSTRUMENT_ID;
const INSTRUMENT_SYMBOL = __ENV.INSTRUMENT_SYMBOL;

if (!JWT || !EXCHANGE_ID || !INSTRUMENT_ID || !INSTRUMENT_SYMBOL) {
  throw new Error(
    "JWT, EXCHANGE_ID, INSTRUMENT_ID, and INSTRUMENT_SYMBOL env vars are required — a real exchange and instrument that already exist in the target database (INSTRUMENT_SYMBOL is that instrument's symbol on EXCHANGE_ID, used to exercise the exchangeId+symbol candle-query resolution path separately from the instrumentId path). See this file's header for how to run this.",
  );
}

const errorRate = new Rate("errors");
const exchangeListDuration = new Trend("exchange_list_duration", true);
const instrumentSearchDuration = new Trend("instrument_search_duration", true);
const candleQueryByIdDuration = new Trend("candle_query_by_id_duration", true);
const candleQueryBySymbolDuration = new Trend("candle_query_by_symbol_duration", true);

export const options = {
  scenarios: {
    // Reference-data reads (exchanges, instrument search) — the
    // lowest-cardinality, most-cacheable-in-principle endpoints, a
    // reasonable proxy for "dashboard just opened" traffic.
    reference_data_reads: {
      executor: "ramping-vus",
      startVUs: 1,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
      exec: "readReferenceData",
    },
    // Candle queries — this module's actual highest-volume read path in
    // production use (charting), the one worth measuring most
    // carefully. A separate, more sustained scenario from the
    // reference-data one above, deliberately — they have different
    // realistic traffic shapes.
    candle_queries: {
      executor: "constant-vus",
      vus: 20,
      duration: "2m",
      exec: "readCandles",
    },
  },
  thresholds: {
    // Named, gateable criteria — a load test without thresholds
    // produces numbers nobody has to act on (the same principle
    // Module 005's own load test script stated).
    http_req_failed: ["rate<0.02"], // <2% hard failures (5xx, network errors, unexpected 4xx)
    exchange_list_duration: ["p(95)<300"],
    instrument_search_duration: ["p(95)<500"],
    candle_query_by_id_duration: ["p(95)<800"], // the heaviest query (date-range scan) gets the most generous budget
    candle_query_by_symbol_duration: ["p(95)<900"], // one extra DB lookup (symbol -> instrumentId) over the by-id path — a slightly wider budget is expected, not a bug if it's a bit slower
  },
};

function authHeaders() {
  return { headers: { Authorization: `Bearer ${JWT}` } };
}

export function readReferenceData() {
  const exchangesRes = http.get(`${BASE_URL}/api/v1/market-data/exchanges`, authHeaders());
  exchangeListDuration.add(exchangesRes.timings.duration);
  const exchangesOk = check(exchangesRes, { "exchanges: status 200": (r) => r.status === 200 });
  errorRate.add(!exchangesOk);

  const searchRes = http.get(`${BASE_URL}/api/v1/market-data/instruments?query=A&page=1&pageSize=20`, authHeaders());
  instrumentSearchDuration.add(searchRes.timings.duration);
  const searchOk = check(searchRes, { "instrument search: status 200": (r) => r.status === 200 });
  errorRate.add(!searchOk);

  sleep(1);
}

export function readCandles() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days back

  const byIdUrl = `${BASE_URL}/api/v1/market-data/candles?instrumentId=${INSTRUMENT_ID}&interval=ONE_DAY&from=${from.toISOString()}&to=${to.toISOString()}&limit=500`;
  const byIdRes = http.get(byIdUrl, authHeaders());
  candleQueryByIdDuration.add(byIdRes.timings.duration);
  const byIdOk = check(byIdRes, { "candles by id: status 200": (r) => r.status === 200 });
  errorRate.add(!byIdOk);

  sleep(0.25);

  // The exchangeId+symbol resolution path (Phase 4) — a real extra DB
  // lookup (InstrumentRepository.findByExchangeAndSymbol) before the
  // same candle query, worth measuring as its own metric rather than
  // averaged into the id-based path's numbers.
  const bySymbolUrl = `${BASE_URL}/api/v1/market-data/candles?exchangeId=${EXCHANGE_ID}&symbol=${INSTRUMENT_SYMBOL}&interval=ONE_DAY&from=${from.toISOString()}&to=${to.toISOString()}&limit=500`;
  const bySymbolRes = http.get(bySymbolUrl, authHeaders());
  candleQueryBySymbolDuration.add(bySymbolRes.timings.duration);
  const bySymbolOk = check(bySymbolRes, { "candles by symbol: status 200": (r) => r.status === 200 });
  errorRate.add(!bySymbolOk);

  sleep(0.5);
}
