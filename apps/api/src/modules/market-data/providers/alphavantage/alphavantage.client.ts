import { Injectable, Logger } from "@nestjs/common";
import type { CandleInterval } from "@rmsm/database";
import type { AlphaVantageApiError } from "./alphavantage.error-mapper";
import { ALPHA_VANTAGE_INTERVAL_FUNCTION } from "./alphavantage.constants";
import type {
  AlphaVantageGlobalQuoteResponse,
  AlphaVantageTimeSeriesResponse,
  AlphaVantageExchangeRateResponse,
  AlphaVantageSearchResponse,
  AlphaVantageOverviewResponse,
  AlphaVantageMarketStatusResponse,
} from "./alphavantage.types";

export interface AlphaVantageClientConfig {
  apiKey: string | undefined;
  baseUrl: string;
  timeoutMs: number;
}

/** A response body shape every Alpha Vantage function shares — the three possible error-signal keys, always optional, always coexisting alongside whatever data keys that specific function actually returns. */
interface AlphaVantageEnvelope {
  "Error Message"?: string;
  Note?: string;
  Information?: string;
}

/**
 * Resolves the `function`/`interval` query params Alpha Vantage needs
 * for a given `CandleInterval`. Alpha Vantage has no 4-hour intraday
 * granularity — `FOUR_HOURS` (and anything else outside this provider's
 * 7-interval support list) throws a clear, descriptive error before any
 * network call is made, rather than silently approximating it.
 */
export function toAlphaVantageRequest(interval: CandleInterval): { fn: string; interval?: string; seriesKey: string } {
  const resolved = ALPHA_VANTAGE_INTERVAL_FUNCTION[interval];
  if (!resolved) {
    throw new Error(
      `Alpha Vantage provider does not support interval "${interval}" — supported: ${Object.keys(ALPHA_VANTAGE_INTERVAL_FUNCTION).join(", ")}.`,
    );
  }
  return resolved;
}

/**
 * Raw HTTP transport for Alpha Vantage's REST API — no SDK dependency,
 * same standing rule as every provider since MD-001. Owns only HTTP
 * transport, timeout handling, envelope validation, and structured
 * logging.
 * Retry, rate limiting, and circuit breaking are owned centrally by
 * `ProviderOrchestrationService`.
 *
 * The one thing genuinely unique to this client versus
 * `TwelveDataClient`/`CoinGeckoClient`: Alpha Vantage's `/query` endpoint
 * returns HTTP 200 for nearly every failure mode, signaling errors
 * through `"Error Message"` / `"Note"` / `"Information"` keys in an
 * otherwise-200 JSON body instead of a 4xx/429 status — `request()`
 * checks for all three on every call, not just as a fallback.
 */
@Injectable()
export class AlphaVantageClient {
  private readonly logger = new Logger(AlphaVantageClient.name);

  constructor(
    private readonly config: AlphaVantageClientConfig,
  ) {}

  async getGlobalQuote(symbol: string): Promise<AlphaVantageGlobalQuoteResponse> {
    return this.request<AlphaVantageGlobalQuoteResponse>({ function: "GLOBAL_QUOTE", symbol });
  }

  async getTimeSeries(symbol: string, interval: CandleInterval): Promise<AlphaVantageTimeSeriesResponse> {
    const resolved = toAlphaVantageRequest(interval);
    return this.request<AlphaVantageTimeSeriesResponse>({
      function: resolved.fn,
      symbol,
      ...(resolved.interval ? { interval: resolved.interval } : {}),
    });
  }

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<AlphaVantageExchangeRateResponse> {
    return this.request<AlphaVantageExchangeRateResponse>({
      function: "CURRENCY_EXCHANGE_RATE",
      from_currency: fromCurrency,
      to_currency: toCurrency,
    });
  }

  async search(keywords: string): Promise<AlphaVantageSearchResponse> {
    return this.request<AlphaVantageSearchResponse>({ function: "SYMBOL_SEARCH", keywords });
  }

  async getOverview(symbol: string): Promise<AlphaVantageOverviewResponse> {
    return this.request<AlphaVantageOverviewResponse>({ function: "OVERVIEW", symbol });
  }

  async getMarketStatus(): Promise<AlphaVantageMarketStatusResponse> {
    return this.request<AlphaVantageMarketStatusResponse>({ function: "MARKET_STATUS" });
  }

  /** Used only by `AlphaVantageHealthProvider` — Alpha Vantage has no dedicated ping/status-of-the-API-itself endpoint, so the cheapest genuinely-representative probe is a GLOBAL_QUOTE for `ALPHA_VANTAGE_HEALTH_CHECK_SYMBOL`, same reasoning as `TwelveDataClient.ping()`. */
  async ping(): Promise<void> {
    await this.getGlobalQuote("IBM");
  }

  private async request<T extends AlphaVantageEnvelope>(
    params: Record<string, string>,
  ): Promise<T> {
    const startedAt = Date.now();

    // `params` never contains `apikey` — appended only inside
    // `fetchOnce()`, so this log line can never leak it.
    this.logger.log({
      msg: "alphavantage.request",
      params,
    });

    try {
      const result = await this.fetchOnce<T>(params);
      const envelopeError = this.checkEnvelope(result);

      if (envelopeError) {
        this.logger.warn({
          msg: "alphavantage.response.envelope_error",
          function: params.function,
          ...envelopeError,
        });
        throw envelopeError;
      }

      this.logger.log({
        msg: "alphavantage.response",
        function: params.function,
        latencyMs: Date.now() - startedAt,
      });

      return result;
    } catch (err) {
      const classified = this.classifyThrown(err);

      this.logger.warn({
        msg: "alphavantage.request.failed",
        function: params.function,
        isTimeout: classified.isTimeout ?? false,
        isNetworkFailure: classified.isNetworkFailure ?? false,
        httpStatus: classified.httpStatus,
      });

      throw classified;
    }
  }

  private checkEnvelope(body: AlphaVantageEnvelope): AlphaVantageApiError | undefined {
    if (body.Note) return { isNoteRateLimit: true, message: body.Note };
    if (body.Information) return { isInformationMessage: true, message: body.Information };
    if (body["Error Message"]) return { isErrorMessage: true, message: body["Error Message"] };
    return undefined;
  }

  private mentionsApiKey(message?: string): boolean {
    const lower = (message ?? "").toLowerCase();
    return lower.includes("apikey") || lower.includes("api key") || lower.includes("premium");
  }

  private async fetchOnce<T>(params: Record<string, string>): Promise<T> {
    const url = new URL("/query", this.config.baseUrl);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", this.config.apiKey ?? "demo");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const res = await fetch(url.toString(), { method: "GET", signal: controller.signal });

      let body: unknown;
      try {
        body = await res.json();
      } catch {
        const malformedError: AlphaVantageApiError = { isMalformedResponse: true, message: "Response body was not valid JSON" };
        throw malformedError;
      }

      if (!res.ok) {
        const apiError: AlphaVantageApiError = { httpStatus: res.status, message: this.extractMessage(body) };
        throw apiError;
      }
      if (typeof body !== "object" || body === null) {
        const malformedError: AlphaVantageApiError = { isMalformedResponse: true, message: "Response body was not a JSON object" };
        throw malformedError;
      }
      return body as T;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const timeoutError: AlphaVantageApiError = { isTimeout: true, message: `Alpha Vantage request exceeded ${this.config.timeoutMs}ms` };
        throw timeoutError;
      }
      if (this.isAlphaVantageApiError(err)) throw err;
      const networkError: AlphaVantageApiError = { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown network failure" };
      throw networkError;
    } finally {
      clearTimeout(timer);
    }
  }

  private isAlphaVantageApiError(err: unknown): err is AlphaVantageApiError {
    return (
      typeof err === "object" &&
      err !== null &&
      ("httpStatus" in err ||
        "isTimeout" in err ||
        "isNetworkFailure" in err ||
        "isMalformedResponse" in err ||
        "isNoteRateLimit" in err ||
        "isInformationMessage" in err ||
        "isErrorMessage" in err)
    );
  }

  private classifyThrown(err: unknown): AlphaVantageApiError {
    if (this.isAlphaVantageApiError(err)) return err;
    return { isNetworkFailure: true, message: err instanceof Error ? err.message : "Unknown error" };
  }

  private extractMessage(body: unknown): string | undefined {
    if (typeof body !== "object" || body === null) return undefined;
    const envelope = body as AlphaVantageEnvelope;
    return envelope["Error Message"] ?? envelope.Note ?? envelope.Information;
  }


}
