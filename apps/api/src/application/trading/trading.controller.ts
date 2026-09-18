import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { PermissionsGuard } from "../../modules/auth/guards/permissions.guard";
import { RequirePermissions } from "../../modules/auth/decorators/permissions.decorator";
import type { AccessTokenPayload } from "../../modules/auth/services/token.service";
import type {
  TradingOrder,
  TradingPosition,
  TradingTrade,
} from "@rmsm/database";
import {
  mapTradingAccount,
  mapTradingLedgerEntry,
} from "./trading.mapper";
import { TradingAccountService } from "./trading.service";
import { PaperTradingService } from "./paper-trading.service";
import {
  AddTradingFundsDto,
  CreateTradingAccountDto,
} from "./dto/trading-account.dto";
import { PlaceOrderDto } from "./dto/paper-order.dto";
import { UpdatePositionRiskDto } from "./dto/update-position-risk.dto";
import { UpdatePendingOrderDto } from "./dto/update-pending-order.dto";

@UseGuards(PermissionsGuard)
@Controller(
  "organizations/:organizationId/trading-accounts",
)
export class TradingController {
  constructor(
    private readonly tradingAccountService: TradingAccountService,
    private readonly paperTradingService: PaperTradingService,
  ) {}

  @Post()
  async create(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Body() dto: CreateTradingAccountDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const account =
      await this.tradingAccountService.createDemoAccount(
        organizationId,
        user.sub,
        {
          name: dto.name,
          currency: dto.currency,
          startingBalance: dto.startingBalance,
          leverage: dto.leverage,
        },
      );

    return mapTradingAccount(account);
  }

  @Get()
  async list(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const accounts =
      await this.tradingAccountService.listAccounts(
        organizationId,
        user.sub,
      );

    return accounts.map(mapTradingAccount);
  }

  @Get(":id/orders")
  async orders(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingOrder[]> {
    return this.paperTradingService.listOrders(
      organizationId,
      user.sub,
      accountId,
    );
  }

  @Get(":id/positions")
  async positions(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingPosition[]> {
    return this.paperTradingService.listPositions(
      organizationId,
      user.sub,
      accountId,
    );
  }

  @Get(":id/trades")
  async trades(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingTrade[]> {
    return this.paperTradingService.listTrades(
      organizationId,
      user.sub,
      accountId,
    );
  }

  @Get(":id")
  async get(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const account =
      await this.tradingAccountService.getAccount(
        organizationId,
        user.sub,
        accountId,
      );

    return mapTradingAccount(account);
  }

  @Patch(":id/positions/:positionId")
  @RequirePermissions("executions.write")
  async updatePositionRisk(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Param("positionId", ParseUUIDPipe)
    positionId: string,
    @Body() dto: UpdatePositionRiskDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingPosition> {
    return this.paperTradingService.updatePositionRisk(
      organizationId,
      user.sub,
      accountId,
      positionId,
      {
        stopLossPrice: dto.stopLossPrice,
        takeProfitPrice: dto.takeProfitPrice,
      },
    );
  }

  @Post(":id/positions/:positionId/close")
  @RequirePermissions("executions.write")
  async closePosition(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Param("positionId", ParseUUIDPipe)
    positionId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.paperTradingService.closePosition(
      organizationId,
      user.sub,
      accountId,
      positionId,
    );
  }

  @Post(":id/positions/:positionId/reverse")
  @RequirePermissions("executions.write")
  async reversePosition(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Param("positionId", ParseUUIDPipe)
    positionId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.paperTradingService.reversePosition(
      organizationId,
      user.sub,
      accountId,
      positionId,
    );
  }

  @Post(":id/orders/cancel-all")
  @RequirePermissions("executions.write")
  async cancelAllOrders(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingOrder[]> {
    return this.paperTradingService.cancelAllOrders(
      organizationId,
      user.sub,
      accountId,
    );
  }

  @Patch(":id/orders/:orderId")
  @RequirePermissions("executions.write")
  async updatePendingOrder(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Param("orderId", ParseUUIDPipe)
    orderId: string,
    @Body() dto: UpdatePendingOrderDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingOrder> {
    return this.paperTradingService.updatePendingOrderPrice(
      organizationId,
      user.sub,
      accountId,
      orderId,
      dto.price,
    );
  }

  @Post(":id/orders/:orderId/cancel")
  @RequirePermissions("executions.write")
  async cancelOrder(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Param("orderId", ParseUUIDPipe)
    orderId: string,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<TradingOrder> {
    return this.paperTradingService.cancelOrder(
      organizationId,
      user.sub,
      accountId,
      orderId,
    );
  }

  @Post(":id/positions/flatten-all")
  @RequirePermissions("executions.write")
  async flattenAllPositions(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.paperTradingService.flattenAllPositions(
      organizationId,
      user.sub,
      accountId,
    );
  }

  @Post(":id/orders")
  @RequirePermissions("executions.write")
  async placeOrder(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Body() dto: PlaceOrderDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    return this.paperTradingService.placeOrder(
      organizationId,
      user.sub,
      accountId,
      {
        instrumentId: dto.instrumentId,
        side: dto.side,
        type: dto.type ?? "MARKET",
        quantity: dto.quantity,
        limitPrice: dto.limitPrice,
        stopPrice: dto.stopPrice,
        stopLossPrice: dto.stopLossPrice,
        takeProfitPrice: dto.takeProfitPrice,
      },
    );
  }

  @Post(":id/funds")
  async addFunds(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @Body() dto: AddTradingFundsDto,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const account =
      await this.tradingAccountService.addVirtualFunds(
        organizationId,
        user.sub,
        accountId,
        dto.amount,
      );

    return mapTradingAccount(account);
  }

  @Post(":id/reset")
  async reset(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const account =
      await this.tradingAccountService.resetDemoAccount(
        organizationId,
        user.sub,
        accountId,
      );

    return mapTradingAccount(account);
  }

  @Get(":id/ledger")
  async ledger(
    @Param("organizationId", ParseUUIDPipe)
    organizationId: string,
    @Param("id", ParseUUIDPipe)
    accountId: string,
    @CurrentUser() user: AccessTokenPayload,
  ) {
    const entries =
      await this.tradingAccountService.listLedger(
        organizationId,
        user.sub,
        accountId,
      );

    return entries.map(mapTradingLedgerEntry);
  }
}
