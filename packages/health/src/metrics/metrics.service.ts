/**
 * Generic, in-memory metrics collection — real counters/gauges/
 * histograms, the same "real in-memory counters" pattern already
 * established elsewhere in this platform (e.g. AI-103's own
 * `StrategyEventMetricsService`). No business-specific metric is defined
 * here; this is purely the collection mechanism a consumer's own code
 * calls into (`metrics.incrementCounter("http_requests_total", { route:
 * "/health" })`).
 *
 * A future extension point, not built here: exporting this snapshot in
 * Prometheus text format or shipping it to a remote metrics backend —
 * `getSnapshot()` returns a plain, JSON-serializable object specifically
 * so a consumer can layer that on top without this package needing to
 * depend on any particular metrics backend's client library.
 */

export type MetricLabels = Readonly<Record<string, string>>;

interface HistogramStats {
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;
}

export interface MetricsSnapshot {
  readonly counters: Readonly<Record<string, number>>;
  readonly gauges: Readonly<Record<string, number>>;
  readonly histograms: Readonly<Record<string, HistogramStats>>;
}

function keyWithLabels(name: string, labels?: MetricLabels): string {
  if (!labels || Object.keys(labels).length === 0) return name;
  const sortedEntries = Object.entries(labels).sort(([a], [b]) => a.localeCompare(b));
  const labelString = sortedEntries.map(([k, v]) => `${k}=${v}`).join(",");
  return `${name}{${labelString}}`;
}

export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();
  private readonly histogramValues = new Map<string, number[]>();

  incrementCounter(name: string, labels?: MetricLabels, amount = 1): void {
    const key = keyWithLabels(name, labels);
    this.counters.set(key, (this.counters.get(key) ?? 0) + amount);
  }

  setGauge(name: string, value: number, labels?: MetricLabels): void {
    this.gauges.set(keyWithLabels(name, labels), value);
  }

  recordHistogram(name: string, value: number, labels?: MetricLabels): void {
    const key = keyWithLabels(name, labels);
    const existing = this.histogramValues.get(key);
    if (existing) {
      existing.push(value);
    } else {
      this.histogramValues.set(key, [value]);
    }
  }

  getSnapshot(): MetricsSnapshot {
    const histograms: Record<string, HistogramStats> = {};
    for (const [key, values] of this.histogramValues) {
      histograms[key] = {
        count: values.length,
        sum: values.reduce((a, b) => a + b, 0),
        min: Math.min(...values),
        max: Math.max(...values),
      };
    }

    return {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms,
    };
  }

  /** Clears every recorded metric — for tests, and for consumers that
   * export-then-reset on a fixed interval (e.g. before each scrape). */
  reset(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histogramValues.clear();
  }
}
