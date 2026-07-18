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
}
