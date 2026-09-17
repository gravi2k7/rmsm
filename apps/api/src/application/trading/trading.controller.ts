import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import { ManualOrderDto } from "./manual-order.dto";
import { ManualTradingService } from "./manual-trading.service";

@ApiTags("Trading")
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller("trading")
export class TradingController {
  constructor(
    private readonly manualTradingService: ManualTradingService,
  ) {}

  @Post("orders")
  @RequirePermissions("executions.write")
  @ApiOperation({
    summary: "Execute a manual MARKET order against the DEMO portfolio.",
  })
  executeOrder(@Body() dto: ManualOrderDto) {
    return this.manualTradingService.executeOrder(
      dto.instrumentId,
      dto.side,
      dto.quantityUnits,
    );
  }
}
