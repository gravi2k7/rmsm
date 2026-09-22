import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { BrokerConnectionService } from "./broker-connection.service";
import { CreateBrokerConnectionDto } from "./dto/create-broker-connection.dto";
import { BindBrokerAccountDto } from "./dto/bind-broker-account.dto";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../modules/auth/services/token.service";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { OrganizationRoleGuard } from "../../modules/organizations/guards/organization-role.guard";
import { RequireOrgRole } from "../../modules/organizations/decorators/require-org-role.decorator";
import { ADMIN_ORG_ROLES } from "../../modules/organizations/constants";

@Controller("organizations/:organizationId/broker-connections")
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
export class BrokerConnectionController {
  constructor(
    private readonly brokerConnectionService: BrokerConnectionService,
  ) {}

  @Post()
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateBrokerConnectionDto,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.brokerConnectionService.create(organizationId, dto);
  }

  @Get()
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.brokerConnectionService.list(organizationId);
  }

  @Post(":id/bind")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  bind(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: BindBrokerAccountDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.brokerConnectionService.bindAccount(
      organizationId,
      user.sub,
      id,
      dto,
    );
  }

  @Post(":id/test")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  test(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.brokerConnectionService.test(organizationId, id);
  }
}
