CREATE TYPE "CommodityCategory" AS ENUM (
  'METALS',
  'ENERGY',
  'AGRICULTURE'
);

ALTER TABLE "instruments"
ADD COLUMN "commodityCategory" "CommodityCategory";
