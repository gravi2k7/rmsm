import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface MarketStatusExchange {
  id: string;
  name: string;
  country: string;
  timezone: string;
  type: string;
  isOpen: boolean;
}

interface MarketStatusPage {
  items: MarketStatusExchange[];
  total: number;
  page: number;
  pageSize: number;
}

/** `GET /markets` — the Phase 4A business-domain layer's own Exchange
 * list, which (unlike the market-data module's `/market-data/exchanges`)
 * carries a real `isOpen` flag. Used only for that field; instrument
 * search/quotes/candles all come from the market-data module above. */
export function useMarketStatuses() {
  return useQuery({
    queryKey: ["markets", "status"],
    queryFn: () => api.get<MarketStatusPage>("/markets?pageSize=100"),
    refetchInterval: 60_000,
  });
}
