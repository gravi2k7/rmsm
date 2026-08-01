import { Injectable } from "@nestjs/common";
import { prisma, UserStatus, Prisma, User, UserWithProfile, UserWithRoles } from "@rmsm/database";
import { paginate, type PaginatedResult, type OffsetPaginationQuery } from "@rmsm/database";

/**
 * Module 004 addition. Search is a simple case-insensitive substring
 * match on email (and, when joined, first/last name) — full-text search
 * is a real, named gap for a future addition, not silently approximated
 * here.
 */
export interface UserDirectoryFilters {
  search?: string;
  status?: UserStatus;
}


/**
 * Repository Pattern: AuthService/UsersService depend on this interface's
 * shape, never on `prisma` directly. Keeps Prisma an implementation detail
 * that can be swapped or mocked in tests without touching business logic.
 *
 * Every method has an explicit `Promise<T>` return type using named types
 * exported from @rmsm/database. Without this, returning a Prisma query
 * directly (e.g. `return prisma.user.findUnique(...)`) infers a
 * `Prisma__UserClient<...>` type that references
 * @prisma/client/runtime/library internals — TypeScript can't name that
 * type in a declaration file emitted from this package, causing TS2742 at
 * every call site. The explicit annotation is a structural assignment
 * (Prisma's chainable promise type is assignable to plain `Promise<T>`),
 * so nothing about the query itself changes — only what gets emitted.
 */
@Injectable()
export class UserRepository {
  findByEmail(email: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({ where: { email }, include: { profile: true } });
  }

  findById(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({ where: { id }, include: { profile: true } });
  }

  findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: { include: { rolePermissions: { include: { permission: true } } } } } } },
    });
  }

  /** WM-020B — `firstName`/`lastName` optional (existing Module 002
   * callers pass neither, and still get an empty `Profile` row exactly as
   * before); populated onto `Profile` when the enterprise `/signup` flow
   * provides them. */
  create(data: {
    email: string;
    passwordHash: string | null;
    status?: UserStatus;
    firstName?: string;
    lastName?: string;
  }): Promise<UserWithProfile> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status ?? "PENDING_VERIFICATION",
        profile: { create: { firstName: data.firstName, lastName: data.lastName } },
      },
      include: { profile: true },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  incrementFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  resetFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  lock(id: string, until: Date): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status: "LOCKED", lockedUntil: until },
    });
  }

  softDelete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status: "DELETED", deletedAt: new Date() },
    });
  }

  // ── Module 004 additions (additive — every method above is unchanged) ──

  /**
   * User Directory: search + filter + paginate + sort, backing
   * `GET /users`. Reuses `@rmsm/database`'s canonical `paginate()` helper
   * (already adopted by `LoginHistoryRepository`) rather than hand-rolling
   * another `skip`/`take`/`count` triple.
   */
  findMany(filters: UserDirectoryFilters, query: OffsetPaginationQuery): Promise<PaginatedResult<UserWithProfile>> {
    const where: Prisma.UserWhereInput = {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.search
        ? {
            OR: [
              { email: { contains: filters.search, mode: "insensitive" } },
              { profile: { firstName: { contains: filters.search, mode: "insensitive" } } },
              { profile: { lastName: { contains: filters.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    };
    return paginate<Prisma.UserWhereInput, UserWithProfile>(
      {
        findMany: (args) =>
          prisma.user.findMany({ ...args, include: { profile: true }, orderBy: { createdAt: "desc" } }),
        count: (args) => prisma.user.count(args),
      },
      where,
      query,
    );
  }

  /** Restores a soft-deleted (or archived) user to ACTIVE. The inverse of `softDelete()`. */
  restore(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", deletedAt: null },
    });
  }

  suspend(id: string): Promise<User> {
    return prisma.user.update({ where: { id }, data: { status: "SUSPENDED" } });
  }

  /** Reactivates a SUSPENDED/LOCKED/ARCHIVED account. Also clears a lockout, since "activate" should never leave an account both ACTIVE and still locked-out. */
  activate(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { status: "ACTIVE", lockedUntil: null, failedLoginAttempts: 0 },
    });
  }

  setMustChangePassword(id: string, value: boolean): Promise<User> {
    return prisma.user.update({ where: { id }, data: { mustChangePassword: value } });
  }

  /**
   * Bulk status transition for CSV bulk-import/bulk-action flows.
   * Deliberately a raw `updateMany` (no per-row audit/event — the calling
   * service layer emits one summary audit entry + event for the whole
   * batch, not N individual ones) — see `UserManagementService.
   * bulkUpdateStatus()`.
   */
  bulkUpdateStatus(ids: string[], status: UserStatus): Promise<Prisma.BatchPayload> {
    return prisma.user.updateMany({ where: { id: { in: ids } }, data: { status } });
  }

  changeEmail(id: string, newEmail: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: { email: newEmail, emailVerifiedAt: null },
    });
  }
}
