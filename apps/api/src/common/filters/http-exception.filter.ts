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
import type { ApiResponse } from "@rmsm/types";

/**
 * Catches everything (HttpException, AppError, and unknown errors) and
 * normalizes it into the standard ApiResponse envelope. This is the single
 * place error shape is decided — controllers never format errors manually.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "INTERNAL_ERROR";
    let message = "An unexpected error occurred";
    let details: unknown;

    if (exception instanceof AppError) {
      status = exception.statusCode;
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === "string" ? res : (res as { message?: string }).message ?? message;
      code = HttpStatus[status] ?? "HTTP_ERROR";
      details = typeof res === "object" ? res : undefined;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} -> ${status}`, (exception as Error)?.stack);
    } else {
      this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
    }

    const body: ApiResponse<null> = {
      success: false,
      data: null,
      error: { code, message, details },
    };

    response.status(status).json(body);
  }
}
