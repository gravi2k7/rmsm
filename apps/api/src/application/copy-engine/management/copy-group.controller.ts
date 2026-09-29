import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PermissionsGuard } from "../../../modules/auth/guards/permissions.guard";
import type {
  CopyExecution,
  CopyGroupMember,
  CopyRule,
} from "@rmsm/database";
import {
  AddCopyGroupMemberDto,
  CreateCopyGroupDto,
  UpdateCopyGroupDto,
  UpdateCopyGroupMemberDto,
  UpsertCopyRuleDto,
} from "./copy-group.dto";
import { CopyGroupService } from "./copy-group.service";

@Controller("organizations/:organizationId/copy-groups")
@UseGuards(PermissionsGuard)
export class CopyGroupController {
  constructor(private readonly service: CopyGroupService) {}

  @Get()
  list(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
  ) {
    return this.service.list(organizationId);
  }

  @Get(":id")
  get(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.service.get(organizationId, id);
  }

  @Post()
  create(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateCopyGroupDto,
  ) {
    return this.service.create(organizationId, dto);
  }

  @Patch(":id")
  update(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateCopyGroupDto,
  ) {
    return this.service.update(organizationId, id, dto);
  }

  @Post(":id/members")
  addMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: AddCopyGroupMemberDto,
  ): Promise<CopyGroupMember> {
    return this.service.addMember(organizationId, id, dto);
  }

  @Patch(":id/members/:memberId")
  updateMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateCopyGroupMemberDto,
  ): Promise<CopyGroupMember> {
    return this.service.updateMember(
      organizationId,
      id,
      memberId,
      dto,
    );
  }

  @Delete(":id/members/:memberId")
  removeMember(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
  ) {
    return this.service.removeMember(
      organizationId,
      id,
      memberId,
    );
  }

  @Patch(":id/members/:memberId/rule")
  updateRule(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @Body() dto: UpsertCopyRuleDto,
  ): Promise<CopyRule> {
    return this.service.upsertRule(
      organizationId,
      id,
      memberId,
      dto,
    );
  }

  @Get(":id/executions")
  listExecutions(
    @Param("organizationId", ParseUUIDPipe) organizationId: string,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<CopyExecution[]> {
    return this.service.listExecutions(
      organizationId,
      id,
    );
  }
}
