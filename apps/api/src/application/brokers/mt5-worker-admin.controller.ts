import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { Mt5WorkerService } from "./mt5-worker.service";
import { CreateMt5WorkerDto } from "./dto/create-mt5-worker.dto";
import { UpdateMt5WorkerStatusDto } from "./dto/update-mt5-worker-status.dto";

@ApiTags("Admin — MT5 Workers")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("admin/mt5-workers")
export class Mt5WorkerAdminController {
  constructor(
    private readonly workerService: Mt5WorkerService,
  ) {}

  @Post()
  @RequirePermissions("admin.mt5-workers.manage")
  @ApiOperation({
    summary: "Provision an MT5 worker.",
  })
  create(@Body() dto: CreateMt5WorkerDto) {
    return this.workerService.provisionWorker(dto);
  }

  @Get()
  @RequirePermissions("admin.mt5-workers.manage")
  @ApiOperation({
    summary: "List MT5 workers.",
  })
  list() {
    return this.workerService.listWorkers();
  }

  @Post(":id/rotate-secret")
  @RequirePermissions("admin.mt5-workers.manage")
  @ApiOperation({
    summary:
      "Rotate an MT5 worker secret. The new secret is returned once.",
  })
  rotateSecret(@Param("id") id: string) {
    return this.workerService.rotateSecret(id);
  }

  @Post(":id/status")
  @RequirePermissions("admin.mt5-workers.manage")
  @ApiOperation({
    summary: "Change MT5 worker administrative status.",
  })
  setStatus(
    @Param("id") id: string,
    @Body() dto: UpdateMt5WorkerStatusDto,
  ) {
    return this.workerService.setStatusById(
      id,
      dto.status,
      dto.lastError,
    );
  }
}
