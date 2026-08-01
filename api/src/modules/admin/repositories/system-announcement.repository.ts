import { Injectable } from "@nestjs/common";
import { prisma, SystemAnnouncement, AnnouncementSeverity, DbClient } from "@rmsm/database";

export interface CreateAnnouncementInput {
  title: string;
  message: string;
  severity: AnnouncementSeverity;
  startsAt?: Date;
  endsAt?: Date;
  createdById?: string;
}

export interface UpdateAnnouncementInput {
  title?: string;
  message?: string;
  severity?: AnnouncementSeverity;
  isActive?: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  updatedById?: string;
}

@Injectable()
export class SystemAnnouncementRepository {
  create(data: CreateAnnouncementInput, client: DbClient = prisma): Promise<SystemAnnouncement> {
    return client.systemAnnouncement.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<SystemAnnouncement | null> {
    return client.systemAnnouncement.findUnique({ where: { id } });
  }

  findActive(now: Date, client: DbClient = prisma): Promise<SystemAnnouncement[]> {
    return client.systemAnnouncement.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
    });
  }

  findAll(client: DbClient = prisma): Promise<SystemAnnouncement[]> {
    return client.systemAnnouncement.findMany({ orderBy: { createdAt: "desc" } });
  }

  update(id: string, data: UpdateAnnouncementInput, client: DbClient = prisma): Promise<SystemAnnouncement> {
    return client.systemAnnouncement.update({ where: { id }, data });
  }

  delete(id: string, client: DbClient = prisma): Promise<SystemAnnouncement> {
    return client.systemAnnouncement.delete({ where: { id } });
  }
}
