import { Injectable } from "@nestjs/common";
import { MaintenanceWindow } from "@rmsm/database";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { MaintenanceWindowRepository } from "../repositories/maintenance-window.repository";

/** Domain 1's "Maintenance Mode" — a single toggle checked by MaintenanceModeMiddleware on every mutating request (see ../middleware/maintenance-mode.middleware.ts). */
@Injectable()
export class MaintenanceModeService {
  constructor(
    private readonly maintenanceRepository: MaintenanceWindowRepository,
    private readonly auditService: AuditService,
  ) {}

  getState(): Promise<MaintenanceWindow> {
    return this.maintenanceRepository.getState();
  }

  async enable(message: string | undefined, actorId: string, ctx: AuditContext = {}): Promise<MaintenanceWindow> {
    const state = await this.maintenanceRepository.enable(message, actorId);
    await this.auditService.log("maintenance-mode.enabled", {
      userId: actorId,
      entityType: "MaintenanceWindow",
      entityId: state.id,
      metadata: { message },
      ...ctx,
    });
    return state;
  }

  async disable(actorId: string, ctx: AuditContext = {}): Promise<MaintenanceWindow> {
    const state = await this.maintenanceRepository.disable();
    await this.auditService.log("maintenance-mode.disabled", {
      userId: actorId,
      entityType: "MaintenanceWindow",
      entityId: state.id,
      ...ctx,
    });
    return state;
  }
}
