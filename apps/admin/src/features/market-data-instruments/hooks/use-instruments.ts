import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Instrument, Exchange, PaginatedResult } from "@/features/market-data-shared/types";

export interface InstrumentSearchParams {
  query?: string;
  assetClass?: string;
  status?: string;
  exchangeId?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Search instruments through the server-side instrument endpoint.
 *
 * The API supports query + pagination through InstrumentSearchDto.
 * Do not load the entire instrument universe into the browser.
 */
export function useInstruments(params: InstrumentSearchParams = {}) {
  const {
    query = "",
    assetClass,
    status,
    exchangeId,
    page = 1,
    pageSize = 50,
  } = params;

  const searchParams = new URLSearchParams();

  if (query.trim()) {
    searchParams.set("query", query.trim());
  }

  if (assetClass) {
    searchParams.set("assetClass", assetClass);
  }

  if (status) {
    searchParams.set("status", status);
  }

  if (exchangeId) {
    searchParams.set("exchangeId", exchangeId);
  }

  searchParams.set("page", String(page));
  searchParams.set("pageSize", String(pageSize));

  const queryString = searchParams.toString();

  return useQuery({
    queryKey: [
      "market-data",
      "instruments",
      {
        query: query.trim(),
        assetClass,
        status,
        exchangeId,
        page,
        pageSize,
      },
    ],
    queryFn: () =>
      api.get<PaginatedResult<Instrument>>(
        `/market-data/instruments?${queryString}`,
      ),
  });
}

export function useInstrument(id: string | undefined) {
  return useQuery({
    queryKey: ["market-data", "instruments", id],
    queryFn: () => api.get<Instrument>(`/market-data/instruments/${id}`),
    enabled: !!id,
  });
}

export function useExchanges() {
  return useQuery({
    queryKey: ["market-data", "exchanges"],
    queryFn: () => api.get<Exchange[]>("/market-data/exchanges"),
  });
}
