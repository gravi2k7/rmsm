import type { Formatter, LogEntry } from "../types/logger.types";

/**
 * Renders a `LogEntry` as a single-line JSON object — the "structured
 * JSON logging" / "JSON logs in production" requirement. One JSON object
 * per call, no pretty-printing, so each line is independently parseable
 * by a log aggregator (the standard newline-delimited-JSON convention).
 */
export class JsonFormatter implements Formatter {
  format(entry: LogEntry): string {
    const record: Record<string, unknown> = {
      level: entry.level,
      message: entry.message,
      timestamp: entry.timestamp,
      ...entry.context,
    };
    if (entry.error) record.error = entry.error;
    return JSON.stringify(record);
  }
}
