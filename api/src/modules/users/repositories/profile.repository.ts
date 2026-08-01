import { Injectable } from "@nestjs/common";
import { prisma, Profile, Prisma } from "@rmsm/database";

/**
 * Repository Pattern for `Profile` — didn't exist before Module 004
 * (the pre-existing, self-service `UsersService` calls `prisma.profile`
 * directly; that file is part of a completed module and is left
 * unchanged here, per this milestone's own instructions). New,
 * admin-facing profile operations go through this repository instead of
 * adding a second direct-`prisma` call site.
 */
export interface AdminUpdateProfileInput {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  timezone?: string;
  language?: string;
  phone?: string;
  notificationPreferences?: Prisma.InputJsonValue;
}

@Injectable()
export class ProfileRepository {
  findByUserId(userId: string): Promise<Profile | null> {
    return prisma.profile.findUnique({ where: { userId } });
  }

  update(userId: string, data: AdminUpdateProfileInput): Promise<Profile> {
    return prisma.profile.update({ where: { userId }, data });
  }

  setDefaultOrganization(userId: string, organizationId: string | null): Promise<Profile> {
    return prisma.profile.update({ where: { userId }, data: { defaultOrganizationId: organizationId } });
  }
}
