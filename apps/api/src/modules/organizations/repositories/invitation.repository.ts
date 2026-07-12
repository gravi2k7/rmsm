import { Injectable } from "@nestjs/common";
import {
  prisma,
  OrganizationInvitation,
  OrganizationInvitationWithOrganization,
  OrganizationRole,
  InvitationStatus,
  Prisma,
  DbClient,
} from "@rmsm/database";

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  tokenHash: string;
  invitedById: string;
  expiresAt: Date;
}

@Injectable()
export class OrganizationInvitationRepository {
  create(data: CreateInvitationInput, client: DbClient = prisma): Promise<OrganizationInvitation> {
    return client.organizationInvitation.create({ data });
  }

  findById(id: string, client: DbClient = prisma): Promise<OrganizationInvitation | null> {
    return client.organizationInvitation.findUnique({ where: { id } });
  }

  findByTokenHash(tokenHash: string, client: DbClient = prisma): Promise<OrganizationInvitation | null> {
    return client.organizationInvitation.findUnique({ where: { tokenHash } });
  }

  findPendingByOrganization(
    organizationId: string,
    client: DbClient = prisma,
  ): Promise<OrganizationInvitation[]> {
    return client.organizationInvitation.findMany({
      where: { organizationId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });
  }

  findPendingByEmail(
    email: string,
    client: DbClient = prisma,
  ): Promise<OrganizationInvitationWithOrganization[]> {
    return client.organizationInvitation.findMany({
      where: { email, status: "PENDING" },
      include: { organization: true },
      orderBy: { createdAt: "desc" },
    });
  }

  updateStatus(
    id: string,
    status: InvitationStatus,
    extra: { acceptedAt?: Date } = {},
    client: DbClient = prisma,
  ): Promise<OrganizationInvitation> {
    return client.organizationInvitation.update({
      where: { id },
      data: { status, ...extra },
    });
  }

  /**
   * Bulk, deterministic, time-based transition — the same category of
   * repository-level utility as Module 002's RefreshTokenRepository
   * .revokeFamily()/SessionRepository.revokeAllForUser(): no business
   * *decision* is made here (what counts as "expired" is just "now"), it's
   * a mechanical status sweep the service layer calls on a schedule.
   */
  expireOverdue(client: DbClient = prisma): Promise<Prisma.BatchPayload> {
    return client.organizationInvitation.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });
  }
}
