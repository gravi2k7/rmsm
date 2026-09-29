import {
  Body,
  Controller,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";

import { Public } from "../../modules/auth/decorators/public.decorator";
import { Mt5WorkerAuthGuard } from "./mt5-worker-auth.guard";
import { Mt5WorkerService } from "./mt5-worker.service";
import { Mt5WorkerRuntimeStatusDto } from "./dto/mt5-worker-runtime-status.dto";

@ApiTags("Internal — MT5 Workers")
@Public()
@UseGuards(Mt5WorkerAuthGuard)
@Controller("internal/mt5/workers/:workerKey")
export class Mt5WorkerInternalController {
  constructor(
    private readonly workerService: Mt5WorkerService,
  ) {}

  @Post("heartbeat")
  @ApiOperation({
    summary: "Record worker heartbeat.",
  })
  heartbeat(
    @Param("workerKey") workerKey: string,
  ) {
    return this.workerService.heartbeat(
      workerKey,
    );
  }

  @Post("status")
  @ApiOperation({
    summary: "Report worker runtime status.",
  })
  status(
    @Param("workerKey") workerKey: string,
    @Body() dto: Mt5WorkerRuntimeStatusDto,
  ) {
    return this.workerService.setStatus(
      workerKey,
      dto.status,
      dto.lastError,
    );
  }
}
