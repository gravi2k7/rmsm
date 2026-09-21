#!/bin/sh
set -e

pnpm --filter @rmsm/database generate

pnpm --filter @rmsm/types build
pnpm --filter @rmsm/shared build
pnpm --filter @rmsm/config build
pnpm --filter @rmsm/core build
pnpm --filter @rmsm/database build
pnpm --filter @rmsm/market build
pnpm --filter @rmsm/decision build
pnpm --filter @rmsm/execution build
pnpm --filter @rmsm/opportunity build
pnpm --filter @rmsm/portfolio build
pnpm --filter @rmsm/strategy build
pnpm --filter @rmsm/api build
pnpm --filter @rmsm/api build

# cTrader Open API protobuf definitions are runtime assets.
# TypeScript does not copy .proto files into dist automatically.
mkdir -p apps/api/dist/modules/market-data/providers/ctrader/openapi/proto
cp apps/api/src/modules/market-data/providers/ctrader/openapi/proto/*.proto \
   apps/api/dist/modules/market-data/providers/ctrader/openapi/proto/
