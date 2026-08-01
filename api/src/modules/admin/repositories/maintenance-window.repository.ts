import { Injectable } from "@nestjs/common";
import { prisma, MaintenanceWindow, DbClient } from "@rmsm/database";

const SINGLETON_ID = "singleton";

@Injectable()
export class MaintenanceWindowRepository {
  async getState(client: DbClient = prisma): Promise<MaintenanceWindow> {
    const existing = await client.maintenanceWindow.findUnique({ where: { id: SINGLETON_ID } });
    if (existing) return existing;
    return client.maintenanceWindow.create({ data: { id: SINGLETON_ID, isEnabled: false } });
  }

  enable(message: string | undefined, enabledById: string | undefined, client: DbClient = prisma): Promise<MaintenanceWindow> {
    return client.maintenanceWindow.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, isEnabled: true, message, enabledById, enabledAt: new Date() },
      update: { isEnabled: true, message, enabledById, enabledAt: new Date(), disabledAt: null },
    });
  }

  disable(client: DbClient = prisma): Promise<MaintenanceWindow> {
    return client.maintenanceWindow.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, isEnabled: false, disabledAt: new Date() },
      update: { isEnabled: false, disabledAt: new Date() },
    });
  }
}
