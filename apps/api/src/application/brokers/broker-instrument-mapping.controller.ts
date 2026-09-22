import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BrokerInstrumentMappingService } from "./broker-instrument-mapping.service";
import { CreateBrokerInstrumentMappingDto } from "./dto/create-broker-instrument-mapping.dto";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { RequireOrgRole } from "../../modules/organizations/decorators/require-org-role.decorator";
import { OrganizationRoleGuard } from "../../modules/organizations/guards/organization-role.guard";
import { ADMIN_ORG_ROLES } from "../../modules/organizations/constants";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import type { AccessTokenPayload } from "../../modules/auth/services/token.service";

@Controller(
  "organizations/:organizationId/broker-connections/:connectionId",
)
@UseGuards(PermissionsGuard, OrganizationRoleGuard)
export class BrokerInstrumentMappingController {
  constructor(
    private readonly service: BrokerInstrumentMappingService,
  ) {}

  @Get("instrument-mappings")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("connectionId", ParseUUIDPipe) connectionId: string,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.service.list(organizationId, connectionId);
  }

  @Post("instrument-mappings")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("connectionId", ParseUUIDPipe) connectionId: string,
    @Body() dto: CreateBrokerInstrumentMappingDto,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.service.create(
      organizationId,
      connectionId,
      dto,
    );
  }

  @Delete("instrument-mappings/:id")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  remove(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("connectionId", ParseUUIDPipe) connectionId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() _user: AccessTokenPayload,
  ) {
    return this.service.remove(
      organizationId,
      connectionId,
      id,
    );
  }

  @Get("contracts")
  @RequirePermissions("organization.settings.update")
  @RequireOrgRole(...ADMIN_ORG_ROLES)
  discoverContracts(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("connectionId", ParseUUIDPipe) connectionId: string,
    @Query("search") search?: string,
    @Query("live") live?: string,
    @CurrentUser() _user?: AccessTokenPayload,
  ) {
    return this.service.discoverContracts(
      organizationId,
      connectionId,
      search,
      live === "true",
    );
  }
}
