import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { Observable, tap } from "rxjs";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, originalUrl, requestId } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        // requestId ties this line to RequestIdMiddleware's correlation
        // id (Phase 5 addition, AI-101's own production-hardening
        // phase, but applied platform-wide since request correlation
        // isn't meaningful scoped to one module) — the same id a caller
        // sees echoed in the X-Request-Id response header, so a support
        // request referencing that header value can be grepped straight
        // out of these logs.
        this.logger.log(`[${requestId ?? "no-request-id"}] ${method} ${originalUrl} +${Date.now() - start}ms`);
      }),
    );
  }
}
