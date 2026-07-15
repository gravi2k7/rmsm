import { randomUUID } from "crypto";
import { Injectable, NestMiddleware } from "@nestjs/common";
import { Request, Response, NextFunction } from "express";

// Request.requestId's type is declared in apps/api/src/types/express.d.ts
// (an ambient .d.ts, not a module augmentation inside this file) — see
// that file's own comment for why it has to live there to actually take
// effect project-wide.

/**
 * Applied globally (AppModule, not scoped to AI-101) — request
 * correlation is inherently a cross-cutting platform concern, not
 * something that means anything scoped to one module. This is
 * additive middleware, not a redesign of anything: it doesn't change
 * how any existing route behaves, only attaches an id and echoes a
 * response header. Phase 5's own "Request correlation" deliverable is
 * genuinely a whole-platform gap (nothing in this codebase had one
 * before this phase), found and fixed here rather than faked as
 * AI-101-scoped when the gap wasn't AI-101-scoped.
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers["x-request-id"];
    req.requestId = typeof incoming === "string" && incoming.length > 0 ? incoming : randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    next();
  }
}
