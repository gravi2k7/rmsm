import type { Formatter, LogEntry, Transport } from "../types/logger.types";
import { PrettyFormatter } from "../formatters/pretty.formatter";

/**
 * Writes a formatted line via the matching `console.*` method for the
 * entry's level — `console.error` for `error`/`fatal`, `console.warn` for
 * `warn`, `console.log` otherwise. Intended for interactive/development
 * use (a real terminal, or a test runner's captured output); see
 * `JsonTransport` for the production/log-aggregator equivalent that
 * writes raw JSON lines directly to `process.stdout` instead.
 */
export class ConsoleTransport implements Transport {
  private readonly formatter: Formatter;

  constructor(formatter: Formatter = new PrettyFormatter()) {
    this.formatter = formatter;
  }

  write(entry: LogEntry): void {
    const line = this.formatter.format(entry);
    if (entry.level === "error" || entry.level === "fatal") {
      console.error(line);
    } else if (entry.level === "warn") {
      console.warn(line);
    } else {
      // eslint-disable-next-line no-console -- this class's entire purpose is writing to the console
      console.log(line);
    }
  }
}
