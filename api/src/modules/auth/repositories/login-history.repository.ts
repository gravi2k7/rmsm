import { Injectable } from "@nestjs/common";
import { prisma, type LoginHistory, type Prisma } from "@rmsm/database";
import { paginate, type PaginatedResult, type OffsetPaginationQuery } from "@rmsm/database";

/**
 * `LoginHistory` rows have been written on every login attempt (success
 * and failure alike) since `AuthService.recordLoginAttempt()` — but
 * nothing has ever read them back. This repository is that missing read
 * path, the one genuine gap in an otherwise fully-implemented
 * authentication module (JWT, refresh rotation with reuse detection,
 * password hashing/reset, email verification, 2FA + recovery codes, and
 * session management were all already complete before this change).
 *
 * Uses `@rmsm/database`'s own new `paginate()` helper (Epic 6) rather
 * than hand-rolling another `skip`/`take`/`count` triple — the first real
 * consumer of that abstraction in `apps/api`.
 */
@Injectable()
export class LoginHistoryRepository {
  findByUser(userId: string, query: OffsetPaginationQuery): Promise<PaginatedResult<LoginHistory>> {
    const where: Prisma.LoginHistoryWhereInput = { userId };
    return paginate(
      {
        findMany: (args) => prisma.loginHistory.findMany({ ...args, orderBy: { createdAt: "desc" } }),
        count: (args) => prisma.loginHistory.count(args),
      },
      where,
      query,
    );
  }

  /**
   * Module 004 addition — admin-wide login history search (Domain 4's
   * "Failed Login History" / Domain 3's Security Dashboard), filterable by
   * success/failure, user, and email. `findByUser` above is left
   * untouched since it's the narrower, already-established shape.
   */
  search(
    filters: { userId?: string; email?: string; success?: boolean },
    query: OffsetPaginationQuery,
  ): Promise<PaginatedResult<LoginHistory>> {
    const where: Prisma.LoginHistoryWhereInput = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.email ? { email: filters.email } : {}),
      ...(filters.success !== undefined ? { success: filters.success } : {}),
    };
    return paginate(
      {
        findMany: (args) => prisma.loginHistory.findMany({ ...args, orderBy: { createdAt: "desc" } }),
        count: (args) => prisma.loginHistory.count(args),
      },
      where,
      query,
    );
  }

  /**
   * Module 004 addition — recent failed-login count for a user, used by
   * the Security Dashboard (mirrors `SessionRepository.countActiveForUser`).
   */
  countRecentFailures(userId: string, sinceMinutes: number): Promise<number> {
    return prisma.loginHistory.count({
      where: { userId, success: false, createdAt: { gte: new Date(Date.now() - sinceMinutes * 60_000) } },
    });
  }
}
