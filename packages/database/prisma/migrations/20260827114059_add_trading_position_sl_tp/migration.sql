-- AlterTable
ALTER TABLE "trading_positions" ADD COLUMN     "stopLossPrice" DECIMAL(24,10),
ADD COLUMN     "takeProfitPrice" DECIMAL(24,10);
