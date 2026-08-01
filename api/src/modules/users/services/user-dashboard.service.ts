import { Injectable } from "@nestjs/common";
import { prisma } from "@rmsm/database";
import { NotFoundError } from "@rmsm/shared";
import { UserRepository } from "../../auth/repositories/user.repository";

export interface UserDashboard {
  userId: string;
  status: string;
  emailVerified: boolean;
  mustChangePassword: boolean;
  failedLoginAttempts: number;
  locked: boolean;
  lastLoginAt: Date | null;
  organizationCount: number;
  roleCount: number;
}

/**
 * Module 004 addition. A single-user security/activity summary, distinct
 * from `GET /users/:id/security` (raw fields) — this is the
 * composed/computed view, matching the "X Dashboard" pattern Module 003
 * established for `OrganizationDashboardService`.
 */
@Injectable()
export class UserDashboardService {
  constructor(private readonly userRepository: UserRepository) {}

  async getDashboard(userId: string): Promise<UserDashboard> {
    const user = await this.userRepository.findById(userId);
    if (!user) throw new NotFoundError("User", userId);

    const [organizationCount, roleCount] = await Promise.all([
      prisma.organizationMembership.count({ where: { userId, status: "ACTIVE" } }),
      prisma.userRole.count({ where: { userId } }),
    ]);

    return {
      userId: user.id,
      status: user.status,
      emailVerified: user.emailVerifiedAt !== null,
      mustChangePassword: user.mustChangePassword,
      failedLoginAttempts: user.failedLoginAttempts,
      locked: user.lockedUntil !== null && user.lockedUntil > new Date(),
      lastLoginAt: user.lastLoginAt,
      organizationCount,
      roleCount,
    };
  }
}
