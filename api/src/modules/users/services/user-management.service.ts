import { Injectable } from "@nestjs/common";
import { User, UserWithProfile, Profile, Organization } from "@rmsm/database";
import type { PaginatedResult, OffsetPaginationQuery } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import { UserRepository, UserDirectoryFilters } from "../../auth/repositories/user.repository";
import { ProfileRepository, AdminUpdateProfileInput } from "../repositories/profile.repository";
import { AuditService, AuditContext } from "../../auth/services/audit.service";
import { AuthService } from "../../auth/auth.service";
import { DomainEventPublisher } from "../../../common/events/domain-event-publisher.service";
import { OrganizationMembershipService } from "../../organizations/services/membership.service";
import { OrganizationInvitationService } from "../../organizations/services/invitation.service";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { USER_EVENTS } from "../events";

/**
 * Module 004 Domain 1 — admin-facing user management. Distinct from the
 * pre-existing, unmodified `UsersService` (self-service `/users/me`
 * endpoints only) — this service is the new admin surface, built on
 * `UserRepository` (extended additively, not duplicated) and the new
 * `ProfileRepository`. Organization-membership operations delegate to
 * Module 003's `OrganizationMembershipService`/`OrganizationInvitationService`
 * rather than re-implementing membership logic here.
 */
@Injectable()
export class UserManagementService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly profileRepository: ProfileRepository,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly eventPublisher: DomainEventPublisher,
    private readonly membershipService: OrganizationMembershipService,
    private readonly invitationService: OrganizationInvitationService,
  ) {}

  list(filters: UserDirectoryFilters, query: OffsetPaginationQuery): Promise<PaginatedResult<UserWithProfile>> {
    return this.userRepository.findMany(filters, query);
  }

  async getById(id: string): Promise<UserWithProfile> {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundError("User", id);
    return user;
  }

  /**
   * Creates a platform account with no password set (mirrors the
   * existing OAuth-only-user state) and immediately triggers the
   * existing, unmodified `AuthService.forgotPassword()` email flow so the
   * new user receives a "set your password" link — reusing the one
   * password-token code path this platform has, rather than accepting
   * and hashing a plaintext password here.
   */
  async createUser(dto: CreateUserDto, actorId: string, ctx: AuditContext = {}): Promise<UserWithProfile> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictError(`A user with email "${dto.email}" already exists.`);

    const user = await this.userRepository.create({
      email: dto.email,
      passwordHash: null,
      firstName: dto.firstName,
      lastName: dto.lastName,
    });

    await this.authService.forgotPassword(dto.email);

    await this.auditService.log("user.created", {
      userId: actorId,
      entityType: "User",
      entityId: user.id,
      metadata: { email: dto.email },
      ...ctx,
    });
    this.eventPublisher.publish(USER_EVENTS.CREATED, { userId: user.id, actorId, email: dto.email });
    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto, actorId: string, ctx: AuditContext = {}): Promise<UserWithProfile> {
    await this.getById(id);

    if (dto.email) {
      await this.userRepository.changeEmail(id, dto.email);
    }

    const profileFields: AdminUpdateProfileInput = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      timezone: dto.timezone,
      language: dto.language,
      phone: dto.phone,
      avatarUrl: dto.avatarUrl,
    };
    if (Object.values(profileFields).some((v) => v !== undefined)) {
      await this.profileRepository.update(id, profileFields);
    }

    await this.auditService.log("user.updated", {
      userId: actorId,
      entityType: "User",
      entityId: id,
      metadata: { fields: Object.keys(dto) },
      ...ctx,
    });
    this.eventPublisher.publish(USER_EVENTS.UPDATED, { userId: id, actorId, fields: Object.keys(dto) });
    return this.getById(id);
  }

  async softDelete(id: string, actorId: string, ctx: AuditContext = {}): Promise<User> {
    await this.getById(id);
    const updated = await this.userRepository.softDelete(id);
    await this.auditService.log("user.deleted", { userId: actorId, entityType: "User", entityId: id, ...ctx });
    this.eventPublisher.publish(USER_EVENTS.DELETED, { userId: id, actorId });
    return updated;
  }

  async restore(id: string, actorId: string, ctx: AuditContext = {}): Promise<User> {
    await this.getById(id);
    const updated = await this.userRepository.restore(id);
    await this.auditService.log("user.restored", { userId: actorId, entityType: "User", entityId: id, ...ctx });
    this.eventPublisher.publish(USER_EVENTS.RESTORED, { userId: id, actorId });
    return updated;
  }

  async suspend(id: string, actorId: string, ctx: AuditContext = {}): Promise<User> {
    await this.getById(id);
    const updated = await this.userRepository.suspend(id);
    await this.auditService.log("user.suspended", { userId: actorId, entityType: "User", entityId: id, ...ctx });
    this.eventPublisher.publish(USER_EVENTS.SUSPENDED, { userId: id, actorId });
    return updated;
  }

  async activate(id: string, actorId: string, ctx: AuditContext = {}): Promise<User> {
    await this.getById(id);
    const updated = await this.userRepository.activate(id);
    await this.auditService.log("user.activated", { userId: actorId, entityType: "User", entityId: id, ...ctx });
    this.eventPublisher.publish(USER_EVENTS.ACTIVATED, { userId: id, actorId });
    return updated;
  }

  /**
   * Bulk status transition backing both "Bulk Import" (rows resolved to
   * user ids by the controller, see `bulk-import.util.ts`) and generic
   * bulk actions. One audit entry + one event for the whole batch — see
   * `UserRepository.bulkUpdateStatus()`'s own comment for why this is
   * deliberately not N individual entries.
   */
  async bulkUpdateStatus(
    userIds: string[],
    status: "ACTIVE" | "SUSPENDED",
    actorId: string,
    ctx: AuditContext = {},
  ): Promise<{ count: number }> {
    const result = await this.userRepository.bulkUpdateStatus(userIds, status);
    await this.auditService.log("user.bulk_status_updated", {
      userId: actorId,
      entityType: "User",
      metadata: { userIds, status, count: result.count },
      ...ctx,
    });
    this.eventPublisher.publish(status === "ACTIVE" ? USER_EVENTS.ACTIVATED : USER_EVENTS.SUSPENDED, {
      actorId,
      userIds,
      bulk: true,
    });
    return { count: result.count };
  }

  async forcePasswordChange(id: string, actorId: string, ctx: AuditContext = {}): Promise<User> {
    await this.getById(id);
    const updated = await this.userRepository.setMustChangePassword(id, true);
    await this.auditService.log("user.password_change_forced", {
      userId: actorId,
      entityType: "User",
      entityId: id,
      ...ctx,
    });
    return updated;
  }

  /** Delegates to the existing, unmodified `AuthService.forgotPassword()` — same reasoning as `createUser()`. */
  async adminResetPassword(id: string): Promise<{ message: string }> {
    const user = await this.getById(id);
    return this.authService.forgotPassword(user.email);
  }

  /** Delegates to the existing, unmodified `AuthService.resendVerification()`. */
  async resendVerification(id: string): Promise<{ message: string }> {
    const user = await this.getById(id);
    return this.authService.resendVerification(user.email);
  }

  getProfile(userId: string): Promise<Profile | null> {
    return this.profileRepository.findByUserId(userId);
  }

  /** Delegates to Module 003's `OrganizationMembershipService.listOrganizationsForUser()` (unmodified). */
  listMemberships(userId: string): Promise<Organization[]> {
    return this.membershipService.listOrganizationsForUser(userId);
  }

  setPrimaryOrganization(userId: string, organizationId: string, actorId: string, ctx: AuditContext = {}): Promise<Profile> {
    const result = this.profileRepository.setDefaultOrganization(userId, organizationId);
    void this.auditService.log("user.primary_organization_set", {
      userId: actorId,
      entityType: "User",
      entityId: userId,
      metadata: { organizationId },
      ...ctx,
    });
    return result;
  }

  /** Delegates to Module 003's `OrganizationInvitationService.createInvitation()` (unmodified) — see InviteUserToOrganizationDto's own comment. */
  inviteToOrganization(
    organizationId: string,
    email: string,
    role: "OWNER" | "ADMINISTRATOR" | "MANAGER" | "ANALYST" | "TRADER" | "VIEWER",
    invitedById: string,
    ctx: AuditContext = {},
    options: { message?: string } = {},
  ): Promise<{ message: string }> {
    this.eventPublisher.publish(USER_EVENTS.INVITED, { organizationId, email, actorId: invitedById });
    return this.invitationService.createInvitation(organizationId, email, role, invitedById, ctx, options);
  }
}
