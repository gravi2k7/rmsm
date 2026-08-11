import { Injectable } from "@nestjs/common";
import {
  prisma,
  UserStatus,
  Prisma,
  User,
  UserRole,
  UserWithProfile,
  UserWithRoles,
} from "@rmsm/database";

/**
 * Repository Pattern: AuthService/UsersService depend on this interface's
 * shape, never on `prisma` directly. Keeps Prisma an implementation detail
 * that can be swapped or mocked in tests without touching business logic.
 *
 * Every method has an explicit Promise<T> return type using named types
 * exported from @rmsm/database. Without this, returning a Prisma query
 * directly (e.g. `return prisma.user.findUnique(...)`) infers a
 * `Prisma__UserClient<...>` type that references
 * @prisma/client/runtime/library internals — TypeScript can't name that
 * type in a declaration file emitted from this package, causing TS2742 at
 * every call site. The explicit annotation is a structural assignment
 * (Prisma's chainable promise type is assignable to plain Promise<T>),
 * so nothing about the query itself changes — only what gets emitted.
 */
@Injectable()
export class UserRepository {
  findByEmail(email: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { email },
      include: { profile: true },
    });
  }

  findById(id: string): Promise<UserWithProfile | null> {
    return prisma.user.findUnique({
      where: { id },
      include: { profile: true },
    });
  }

  findByIdWithRoles(id: string): Promise<UserWithRoles | null> {
    return prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                rolePermissions: {
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Assigns a platform role to a user by role name.
   *
   * Role assignment is idempotent: if the user already has the
   * requested non-tenant role, the existing assignment is returned.
   */
  async assignRoleByName(
    userId: string,
    roleName: string,
  ): Promise<UserRole> {
    const role = await prisma.role.findUnique({
      where: { name: roleName },
    });

    if (!role) {
      throw new Error(`Role "${roleName}" does not exist.`);
    }

    const existing = await prisma.userRole.findFirst({
      where: {
        userId,
        roleId: role.id,
        tenantId: null,
      },
    });

    return (
      existing ??
      prisma.userRole.create({
        data: {
          userId,
          roleId: role.id,
        },
      })
    );
  }

  /**
   * WM-020B — `firstName`/`lastName` optional (existing Module 002
   * callers pass neither, and still get an empty `Profile` row exactly as
   * before); populated onto `Profile` when the enterprise `/signup` flow
   * provides them.
   */
  create(data: {
    email: string;
    passwordHash: string | null;
    status?: UserStatus;
    firstName?: string;
    lastName?: string;
  }): Promise<User & { profile: UserWithProfile["profile"] }> {
    return prisma.user.create({
      data: {
        email: data.email,
        passwordHash: data.passwordHash,
        status: data.status ?? "PENDING_VERIFICATION",
        profile: {
          create: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        },
      },
      include: { profile: true },
    });
  }

  update(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  incrementFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: {
          increment: 1,
        },
      },
    });
  }

  resetFailedAttempts(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });
  }

  lock(id: string, until: Date): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        status: "LOCKED",
        lockedUntil: until,
      },
    });
  }

  softDelete(id: string): Promise<User> {
    return prisma.user.update({
      where: { id },
      data: {
        status: "DELETED",
        deletedAt: new Date(),
      },
    });
  }
}