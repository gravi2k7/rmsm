import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import type { ApiResponse } from "@rmsm/types";
import { IndicatorValidationError } from "../../contracts/validation.interface";
import { RegistryValidationError } from "../../contracts/registry-validation.errors";
import { ExecutionError } from "../../contracts/execution.errors";
import { GraphError } from "../../contracts/graph.errors";
import { ServiceError } from "../../contracts/service.errors";

/**
 * Item 9's own error-mapping requirement, applied to AI-102's 5
 * internal error hierarchies (`IndicatorValidationError` — Phase 1,
 * `RegistryValidationError` — Phase 2A, `ExecutionError` — Phase 2B,
 * `GraphError` — Phase 2C, `ServiceError` — Phase 3) — none of which
 * extend `@rmsm/shared`'s `AppError`, so the platform's own
 * `GlobalExceptionFilter` would otherwise catch every one of them as a
 * generic 500. Scoped to `IndicatorController` only (`@UseFilters()`,
 * not a platform-wide change) — these 5 hierarchies are AI-102's own
 * internal taxonomy, not something the rest of the platform needs to
 * know about. Falls through to `GlobalExceptionFilter`'s own behavior
 * for anything it doesn't recognize (a genuinely unexpected error still
 * becomes a clean 500, not an unhandled crash) by re-throwing rather
 * than swallowing.
 *
 * **Never exposes an internal stack trace** (item 9's own explicit
 * rule) — only `message`/`code`/`context` cross into the HTTP response;
 * `exception.stack` is logged, never serialized into `body`.
 */
@Catch(IndicatorValidationError, RegistryValidationError, ExecutionError, GraphError, ServiceError)
export class IndicatorExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(IndicatorExceptionFilter.name);

  catch(exception: IndicatorValidationError | RegistryValidationError | ExecutionError | GraphError | ServiceError, host: ArgumentsHost): void {
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

  /**
   * By error CODE, not a long instanceof chain against every one of
   * AI-102's ~30 concrete error classes — every class across all 5
   * hierarchies already carries a real `code: string` discriminator
   * (each hierarchy's own base class requires it), so switching on that
   * is both exhaustive and maintainable without an instanceof per
   * class. "Not found"-flavored codes map to 404; everything else in
   * these 5 hierarchies is a semantically-invalid-input-or-state
   * problem (422) rather than malformed request syntax (400 — already
   * handled entirely by NestJS's own ValidationPipe on the DTOs before
   * a request ever reaches a service, per item 3's own instruction), a
   * conflict (409, reserved for a future write endpoint this phase
   * doesn't add), or a genuinely unexpected failure (500).
   */
  private mapStatus(exception: IndicatorValidationError | RegistryValidationError | ExecutionError | GraphError | ServiceError): number {
    const notFoundCodes = new Set(["IndicatorNotFound", "DependencyNotFound"]);
    const conflictCodes = new Set(["DuplicateDefinition"]);
    const serverErrorCodes = new Set(["RegistryService", "PlannerService"]);

    if (notFoundCodes.has(exception.code)) return HttpStatus.NOT_FOUND;
    if (conflictCodes.has(exception.code)) return HttpStatus.CONFLICT;
    if (serverErrorCodes.has(exception.code)) return HttpStatus.INTERNAL_SERVER_ERROR;
    return HttpStatus.UNPROCESSABLE_ENTITY;
  }
}
