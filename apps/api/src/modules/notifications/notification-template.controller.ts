import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { NotFoundError } from "@rmsm/shared";
import type { NotificationTemplate } from "@rmsm/database";
import { TemplateService } from "./services/template.service";
import { NotificationTemplateRepository } from "./repositories/notification-template.repository";
import { CreateTemplateDto } from "./dto/create-template.dto";
import { RequirePermissions } from "../auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import { RequireOrgRole } from "../organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../organizations/guards/organization-role.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../auth/services/token.service";
import { NOTIFICATION_TEMPLATE_MANAGE_ROLES } from "./constants";

@ApiTags("Notification Templates")
@ApiBearerAuth()
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
@Controller("notifications/organizations/:organizationId/templates")
export class NotificationTemplateController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly templateRepository: NotificationTemplateRepository,
  ) {}

  @Post()
  @RequirePermissions("notification.template.manage")
  @RequireOrgRole(...NOTIFICATION_TEMPLATE_MANAGE_ROLES)
  @ApiOperation({ operationId: "createTemplate", summary: "Create a notification template." })
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationTemplate> {
    return this.templateService.create({ ...dto, organizationId }, user.sub);
  }

  @Get()
  @RequirePermissions("notification.template.manage")
  @RequireOrgRole(...NOTIFICATION_TEMPLATE_MANAGE_ROLES)
  @ApiOperation({ operationId: "listTemplates", summary: "List this organization's templates." })
  list(@Param("organizationId", ParseUUIDPipe) organizationId: string): Promise<NotificationTemplate[]> {
    return this.templateRepository.findByOrganization(organizationId, {}, { take: 100, skip: 0 });
  }

  @Get(":key")
  @ApiQuery({ name: "locale", required: false })
  @RequirePermissions("notification.template.manage")
  @RequireOrgRole(...NOTIFICATION_TEMPLATE_MANAGE_ROLES)
  @ApiOperation({ operationId: "getTemplateByKey", summary: "Get a single template by key/locale." })
  async get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("key") key: string,
    @Query("locale") locale = "en",
  ): Promise<NotificationTemplate> {
    const template = await this.templateRepository.findByKey(organizationId, key, locale);
    if (!template) {
      throw new NotFoundError("NotificationTemplate", `${key}/${locale}`);
    }
    return template;
  }

  @Patch(":id")
  @RequirePermissions("notification.template.manage")
  @RequireOrgRole(...NOTIFICATION_TEMPLATE_MANAGE_ROLES)
  @ApiOperation({ operationId: "updateTemplate", summary: "Update a template." })
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateTemplateDto>,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<NotificationTemplate> {
    return this.templateService.update(id, dto, user.sub);
  }
}
