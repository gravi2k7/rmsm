import { Injectable, NestMiddleware, ServiceUnavailableException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { MaintenanceWindowRepository } from "../repositories/maintenance-window.repository";

/**
 * Domain 1's "Maintenance Mode" — the actual enforcement half (the
 * AdminController/MaintenanceModeService pair is only the toggle). Applied
 * in app.module.ts's `configure()` to every route except the ones a
 * platform operator needs to reach WHILE maintenance mode is on:
 * `/admin/*` (to turn it back off), `/health/*` (liveness/readiness
 * probes must keep working), and GET requests generally (reads stay
 * available; only mutations are blocked — a read-heavy trading platform
 * shouldn't go fully dark for a routine maintenance window).
 */
@Injectable()
export class MaintenanceModeMiddleware implements NestMiddleware {
  constructor(private readonly maintenanceRepository: MaintenanceWindowRepository) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
      next();
      return;
    }

    const state = await this.maintenanceRepository.getState();
    if (!state.isEnabled) {
      next();
      return;
    }

    throw new ServiceUnavailableException({
      message: state.message ?? "The platform is currently undergoing scheduled maintenance. Please try again shortly.",
      maintenanceMode: true,
    });
  }
}
