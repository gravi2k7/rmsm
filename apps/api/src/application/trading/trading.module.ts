import { Module } from "@nestjs/common";
import { MarketDataModule } from "../../modules/market-data/market-data.module";
import { PortfolioApplicationModule } from "../portfolio/portfolio.module";
import { TradingController } from "./trading.controller";
import { ManualTradingService } from "./manual-trading.service";

@Module({
  imports: [
    MarketDataModule,
    PortfolioApplicationModule,
  ],
  controllers: [TradingController],
  providers: [ManualTradingService],
})
export class TradingApplicationModule {}
