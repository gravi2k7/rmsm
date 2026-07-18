import type { Formatter, LogEntry, Transport } from "../types/logger.types";
import { JsonFormatter } from "../formatters/json.formatter";

/**
 * Writes one JSON line per entry directly to `process.stdout`, bypassing
 * `console.*` entirely. Always uses a JSON-producing formatter (defaults
 * to `JsonFormatter`) regardless of what's configured elsewhere — this
 * transport's entire reason to exist is guaranteeing machine-parseable
 * output for a log-aggregator/shipper reading the process's stdout, so it
 * doesn't accept a `PrettyFormatter` making that guarantee meaningless.
 */
export class JsonTransport implements Transport {
  private readonly formatter: Formatter;

  constructor(formatter: Formatter = new JsonFormatter()) {
    this.formatter = formatter;
  }

  write(entry: LogEntry): void {
    process.stdout.write(this.formatter.format(entry) + "\n");
  }
}
