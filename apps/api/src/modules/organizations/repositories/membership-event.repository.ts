import { Injectable } from "@nestjs/common";
import { prisma, OrganizationMembershipEvent, MembershipEventAction, OrganizationRole, DbClient, Prisma } from "@rmsm/database";

export interface CreateMembershipEventInput {
  organizationId: string;
  userId?: string;
  action: MembershipEventAction;
  previousRole?: OrganizationRole;
  newRole?: OrganizationRole;
  actorId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * `Record<string, unknown>` isn't structurally assignable to
 * `Prisma.InputJsonValue` (see the audit.service.ts TS2742 fix this
 * mirrors) — round-tripping through JSON is the same correct conversion,
 * applied here proactively rather than waiting for the same class of
 * compile error to resurface in this new repository.
 */
function toInputJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

/**
 * Append-only — intentionally has no update/delete methods. This is the
 * durable membership timeline ("preserve membership history"); nothing
 * should ever mutate a past event.
 */
@Injectable()
export class OrganizationMembershipEventRepository {
  create(
    data: CreateMembershipEventInput,
    client: DbClient = prisma,
  ): Promise<OrganizationMembershipEvent> {
    return client.organizationMembershipEvent.create({
      data: {
        organizationId: data.organizationId,
        userId: data.userId,
        action: data.action,
        previousRole: data.previousRole,
        newRole: data.newRole,
        actorId: data.actorId,
        metadata: toInputJsonValue(data.metadata ?? {}),
      },
    });
  }

  findByOrganization(
    organizationId: string,
    take = 50,
    client: DbClient = prisma,
  ): Promise<OrganizationMembershipEvent[]> {
    return client.organizationMembershipEvent.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }

  findByMembership(
    organizationId: string,
    userId: string,
    take = 50,
    client: DbClient = prisma,
  ): Promise<OrganizationMembershipEvent[]> {
    return client.organizationMembershipEvent.findMany({
      where: { organizationId, userId },
      orderBy: { createdAt: "desc" },
      take,
    });
  }
}
