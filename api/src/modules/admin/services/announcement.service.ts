import { Injectable } from "@nestjs/common";
import { SystemAnnouncement } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import {
  SystemAnnouncementRepository,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from "../repositories/system-announcement.repository";

/** Domain 1's "System Announcements." */
@Injectable()
export class AnnouncementService {
  constructor(
    private readonly announcementRepository: SystemAnnouncementRepository,
    private readonly auditService: AuditService,
  ) {}

  listAll(): Promise<SystemAnnouncement[]> {
    return this.announcementRepository.findAll();
  }

  listActive(): Promise<SystemAnnouncement[]> {
    return this.announcementRepository.findActive(new Date());
  }

  async create(input: CreateAnnouncementInput, actorId: string, ctx: AuditContext = {}): Promise<SystemAnnouncement> {
    const announcement = await this.announcementRepository.create({ ...input, createdById: actorId });
    await this.auditService.log("system-announcement.created", {
      userId: actorId,
      entityType: "SystemAnnouncement",
      entityId: announcement.id,
      metadata: { severity: input.severity },
      ...ctx,
    });
    return announcement;
  }

  async update(id: string, input: UpdateAnnouncementInput, actorId: string, ctx: AuditContext = {}): Promise<SystemAnnouncement> {
    const existing = await this.announcementRepository.findById(id);
    if (!existing) throw new NotFoundError("SystemAnnouncement", id);
    const updated = await this.announcementRepository.update(id, { ...input, updatedById: actorId });
    await this.auditService.log("system-announcement.updated", {
      userId: actorId,
      entityType: "SystemAnnouncement",
      entityId: id,
      ...ctx,
    });
    return updated;
  }

  async delete(id: string, actorId: string, ctx: AuditContext = {}): Promise<void> {
    const existing = await this.announcementRepository.findById(id);
    if (!existing) throw new NotFoundError("SystemAnnouncement", id);
    await this.announcementRepository.delete(id);
    await this.auditService.log("system-announcement.deleted", {
      userId: actorId,
      entityType: "SystemAnnouncement",
      entityId: id,
      ...ctx,
    });
  }
}
