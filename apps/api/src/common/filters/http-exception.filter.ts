import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { AppError } from "@rmsm/shared";
import { DomainError } from "@rmsm/core";
import type { ApiResponse } from "@rmsm/types";
import { mapDomainErrorToAppError } from "../../application/common/errors/domain-error.mapper";

/**
 * Catches everything (HttpException, AppError, DomainError, and unknown
 * errors) and normalizes it into the standard ApiResponse envelope. This
 * is the single place error shape is decided — controllers never format
 * errors manually.
 *
 * `DomainError` handling (Phase 4A): every one of the 6 business domain
 * packages (Market, Strategy, Opportunity, Decision, Execution,
 * Portfolio) raises `@rmsm/core`'s own `DomainError` subclasses, which
 * carry no HTTP status by design — the domain layer must not know HTTP
 * exists. `mapDomainErrorToAppError()` is the one adapter that converts
 * one into an `AppError` (which does carry a status), reusing the exact
 * same response path `AppError` already had rather than adding a second,
 * parallel formatting branch.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const normalized = exception instanceof DomainError ? mapDomainErrorToAppError(exception) : exception;

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown;

    if (normalized instanceof AppError) {
      status = normalized.statusCode;
      code = normalized.code;
      message = normalized.message;
      details = normalized.details;
    } else if (normalized instanceof HttpException) {
      status = normalized.getStatus();
      const res = normalized.getResponse();
      message = typeof res === "string" ? res : (res as { message?: string }).message ?? message;
      code = HttpStatus[status] ?? "HTTP_ERROR";
      details = typeof res === "object" ? res : undefined;
    } else if (normalized instanceof Error) {
      message = normalized.message;
    }

    if (status >= 500) {
      this.logger.error(`[${request.requestId ?? "no-request-id"}] ${request.method} ${request.url} -> ${status}`, (exception as Error)?.stack);
    } else {
      this.logger.warn(`[${request.requestId ?? "no-request-id"}] ${request.method} ${request.url} -> ${status}: ${message}`);
    }

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: { code, message, details },
      // requestId surfaced in the error body itself, not just server
      // logs — so a caller reporting a failed request can hand back
      // the exact id to search for, without needing log access
      // themselves (Phase 5's "Request correlation" deliverable,
      // applied where it matters most: the one response shape every
      // failure actually returns).
      meta: request.requestId ? { requestId: request.requestId } : undefined,
    };

    response.status(status).json(body);
  }
}
