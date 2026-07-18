import type { Formatter, LogEntry } from "../types/logger.types";

/**
 * Renders a `LogEntry` as a single human-readable line for local
 * development — the "pretty logs in development" requirement. Uses raw
 * ANSI escape codes rather than a color library, to keep this package
 * dependency-free.
 */
const ANSI_RESET = "\x1b[0m";
const ANSI_DIM = "\x1b[2m";

const LEVEL_COLOR: Readonly<Record<LogEntry["level"], string>> = {
  trace: "\x1b[90m", // gray
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m", // green
  warn: "\x1b[33m", // yellow
  error: "\x1b[31m", // red
  fatal: "\x1b[41m\x1b[97m", // white on red background
};

export interface PrettyFormatterOptions {
  /** Disable ANSI color codes — e.g. when output is piped to a file or a
   * terminal that doesn't support them. Defaults to `true` (colored). */
  readonly colors?: boolean;
}

export class PrettyFormatter implements Formatter {
  private readonly colors: boolean;

  constructor(options: PrettyFormatterOptions = {}) {
    this.colors = options.colors ?? true;
  }

  format(entry: LogEntry): string {
    const time = entry.timestamp.split("T")[1]?.replace("Z", "") ?? entry.timestamp;
    const levelLabel = entry.level.toUpperCase().padEnd(5);
    const levelText = this.colors ? `${LEVEL_COLOR[entry.level]}${levelLabel}${ANSI_RESET}` : levelLabel;
    const timeText = this.colors ? `${ANSI_DIM}${time}${ANSI_RESET}` : time;

    const contextEntries = Object.entries(entry.context);
    const contextText = contextEntries.length > 0 ? " " + contextEntries.map(([key, value]) => `${key}=${stringifyValue(value)}`).join(" ") : "";

    let line = `${timeText} ${levelText} ${entry.message}${contextText}`;

    if (entry.error) {
      const errorLine = entry.error.stack ?? `${entry.error.name}: ${entry.error.message}`;
      line += `\n${this.colors ? ANSI_DIM : ""}${errorLine}${this.colors ? ANSI_RESET : ""}`;
    }

    return line;
  }
}

function stringifyValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
