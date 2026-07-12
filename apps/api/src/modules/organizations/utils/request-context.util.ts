import type { Request } from "express";

/** Same shape as Module 002's local requestContext() helper in auth.controller.ts — factored out here since 4 controllers in this module need it. */
export function requestContext(req: Request): { ipAddress?: string; userAgent?: string } {
  return { ipAddress: req.ip, userAgent: req.headers["user-agent"] };
}
