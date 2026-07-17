import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import type { ApiResponse } from "@rmsm/types";
import { StrategyApplicationError } from "../../application/errors/application.errors";
import { StrategyDomainError } from "../../domain/errors/strategy-domain.errors";

/**
 * The direct precedent is AI-102's own `IndicatorExceptionFilter`
 * (Phase 4) — same shape, same discipline: never expose an internal
 * stack trace, log structured lines including the platform's own
 * `requestId` correlation, map by each error's own `code` field rather
 * than a long `instanceof` chain. Catches BOTH this module's own
 * hierarchies (`StrategyApplicationError` — orchestration failures,
 * and `StrategyDomainError` — a domain aggregate refusing to violate
 * its own invariant, e.g. trying to edit a published version) — a
 * domain error reaching the REST boundary directly is real and
 * expected (a command handler doesn't wrap every possible
 * `InvalidVersionTransitionError` in its own application-level
 * exception; the domain's own error IS specific enough to map
 * directly).
 */
@Catch(StrategyApplicationError, StrategyDomainError)
export class StrategyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(StrategyExceptionFilter.name);

  catch(exception: StrategyApplicationError | StrategyDomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = this.mapStatus(exception);

    if (status >= 500) {
      this.logger.error(`[${request.requestId ?? "no-request-id"}] ${request.method} ${request.url} -> ${status}`, exception.stack);
    } else {
      this.logger.warn(`[${request.requestId ?? "no-request-id"}] ${request.method} ${request.url} -> ${status}: ${exception.message}`);
    }

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: { code: exception.code, message: exception.message, details: exception.context },
      meta: request.requestId ? { requestId: request.requestId } : undefined,
    };

    response.status(status).json(body);
  }

  private mapStatus(exception: StrategyApplicationError | StrategyDomainError): number {
    const notFoundCodes = new Set(["StrategyNotFound", "StrategyVersionNotFound"]);
    const conflictCodes = new Set(["DuplicateSlug", "InvalidVersionTransition", "ImmutablePublishedVersion", "NoPendingApproval", "VersionNotApproved", "InvalidStrategyState"]);

    if (notFoundCodes.has(exception.code)) return HttpStatus.NOT_FOUND;
    if (conflictCodes.has(exception.code)) return HttpStatus.CONFLICT;
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
