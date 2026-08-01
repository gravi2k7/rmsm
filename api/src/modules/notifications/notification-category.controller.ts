import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { NotificationCategory } from "@rmsm/database";
import { ConflictError, NotFoundError } from "@rmsm/shared";
import { NotificationCategoryRepository } from "./repositories/notification-category.repository";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";
import { AuditService } from "../auth/services/audit.service";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";

/**
 * Domain 3's "Notification Categories" — the prompt's own flat
 * `/notifications/categories` REST example path. The NotificationCategory
 * model existed since Phase 2a with no repository or controller at all
 * (flagged explicitly in notification-preference.controller.ts's own doc
 * comment as a Phase 2c gap) — this is that gap, closed. `organizationId`
 * is accepted in the create body (optional) so a caller can create either
 * a platform-wide category (omitted) or an organization's own custom one,
 * matching the model's own documented dual-scope design.
 */
@ApiTags("Notification Categories")
@ApiBearerAuth()
@Controller("notifications/categories")
export class NotificationCategoryController {
  constructor(
    private readonly categoryRepository: NotificationCategoryRepository,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @RequirePermissions("notification.read")
  @ApiOperation({ summary: "List categories visible to a scope — platform-wide plus (if organizationId given) that organization's own." })
  list(@Query("organizationId") organizationId?: string): Promise<NotificationCategory[]> {
    return this.categoryRepository.findForScope(organizationId ?? null);
  }

  @Get(":id")
  @RequirePermissions("notification.read")
  @ApiOperation({ summary: "Get a category by id." })
  async getById(@Param("id", ParseUUIDPipe) id: string): Promise<NotificationCategory> {
    const category = await this.categoryRepository.findById(id);
    if (!category) throw new NotFoundError("NotificationCategory", id);
    return category;
  }

  @Post()
  @RequirePermissions("notification.category.manage")
  @ApiOperation({ summary: "Create a category (platform-wide if organizationId omitted)." })
  async create(@Body() dto: CreateCategoryDto & { organizationId?: string }, @CurrentUser() user: AccessTokenPayload): Promise<NotificationCategory> {
    const existing = await this.categoryRepository.findByScopeAndKey(dto.organizationId ?? null, dto.key);
    if (existing) {
      throw new ConflictError(`A category with key "${dto.key}" already exists in this scope.`);
    }
    const category = await this.categoryRepository.create({ ...dto, createdById: user.sub });
    await this.auditService.log("notification.category.created", {
      userId: user.sub,
      entityType: "NotificationCategory",
      entityId: category.id,
      metadata: { key: dto.key, organizationId: dto.organizationId ?? null },
    });
    return category;
  }

  @Patch(":id")
  @RequirePermissions("notification.category.manage")
  @ApiOperation({ summary: "Update a category." })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationCategory> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) throw new NotFoundError("NotificationCategory", id);
    const updated = await this.categoryRepository.update(id, { ...dto, updatedById: user.sub });
    await this.auditService.log("notification.category.updated", {
      userId: user.sub,
      entityType: "NotificationCategory",
      entityId: id,
    });
    return updated;
  }

  @Delete(":id")
  @RequirePermissions("notification.category.manage")
  @ApiOperation({ summary: "Delete a category." })
  async delete(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: AccessTokenPayload): Promise<{ deleted: true }> {
    const existing = await this.categoryRepository.findById(id);
    if (!existing) throw new NotFoundError("NotificationCategory", id);
    await this.categoryRepository.delete(id);
    await this.auditService.log("notification.category.deleted", {
      userId: user.sub,
      entityType: "NotificationCategory",
      entityId: id,
    });
    return { deleted: true };
  }
}
