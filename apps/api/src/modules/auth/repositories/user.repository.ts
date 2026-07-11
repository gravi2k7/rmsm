import { Injectable } from "@nestjs/common";
import { prisma, UserStatus, Prisma, User, UserWithProfile, UserWithRoles } from "@rmsm/database";

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

  create(data: { email: string; passwordHash: string | null; status?: UserStatus }): Promise<UserWithProfile> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status ?? "PENDING_VERIFICATION",
        profile: { create: {} },
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
}
