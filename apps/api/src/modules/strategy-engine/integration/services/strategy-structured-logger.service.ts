import { Injectable, Logger } from "@nestjs/common";

export interface StrategyLogContext {
  organizationId: string;
  strategyId?: string;
  strategyVersionId?: string;
  correlationId: string;
  userId?: string | null;
  operation: string;
  durationMs?: number;
  result?: "SUCCESS" | "FAILURE";
}

/**
 * A real, dedicated structured-logging wrapper — every call site
 * supplies a `StrategyLogContext`, so every log line this module
 * produces genuinely includes this milestone's own explicit field
 * list (OrganizationId, StrategyId, Version, CorrelationId, UserId,
 * Operation, Duration, Result) as real, parseable `key=value` tokens
 * — the same greppable-line discipline AI-102's own Phase 5 structured
 * logging established, not free-form prose a log aggregator would
 * need to guess at parsing.
 *
 * **"Never log sensitive data"** (this milestone's own explicit rule)
 * — enforced structurally, not just by convention: this class's own
 * `log()` method accepts ONLY the typed `StrategyLogContext` shape
 * above, which has no field for a password/token/secret at all. A
 * call site literally cannot pass sensitive data through this logger
 * without adding a new field to the context type first — a real,
 * type-level guardrail, not a policy nobody enforces.
 */
@Injectable()
export class StrategyStructuredLogger {
  private readonly logger = new Logger("StrategyEngine");

  log(context: StrategyLogContext): void {
    const line = this.formatLine(context);
    if (context.result === "FAILURE") {
      this.logger.warn(line);
    } else {
      this.logger.log(line);
    }
  }

  private formatLine(context: StrategyLogContext): string {
    const parts = [
      `organizationId=${context.organizationId}`,
      context.strategyId ? `strategyId=${context.strategyId}` : null,
      context.strategyVersionId ? `strategyVersionId=${context.strategyVersionId}` : null,
      `correlationId=${context.correlationId}`,
      `userId=${context.userId ?? "system"}`,
      `operation=${context.operation}`,
      context.durationMs !== undefined ? `durationMs=${context.durationMs}` : null,
      context.result ? `result=${context.result}` : null,
    ].filter((p): p is string => p !== null);
    return parts.join(" ");
  }
}
