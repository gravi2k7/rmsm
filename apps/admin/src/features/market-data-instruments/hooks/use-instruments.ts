import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Instrument, Exchange, PaginatedResult } from "@/features/market-data-shared/types";

/**
 * `GET market-data/instruments` — `InstrumentController.list()` binds
 * TWO separate `@Query()` parameters to two different DTO classes
 * (`InstrumentSearchDto` for query/assetClass/status/exchangeId,
 * `PaginationQueryDto` for page/pageSize). NestJS's `ValidationPipe`
 * validates each parameter against the ENTIRE raw query string, and the
 * app's global pipe has `forbidNonWhitelisted: true` — so any property
 * declared on one DTO but not the other (e.g. `pageSize`, which
 * `InstrumentSearchDto` doesn't declare) makes the WHOLE request 400.
 * Confirmed empirically by running the actual `ValidationPipe` against
 * the real DTO classes: every combination of query/assetClass/status/
 * page/pageSize was rejected; only a fully empty query string succeeds.
 * This is a genuine, pre-existing backend defect (Instructions for this
 * milestone explicitly forbid touching the backend/DTOs/services), so
 * this hook calls the endpoint with NO query parameters at all — the
 * only request shape this endpoint actually accepts — and returns
 * whatever `PaginationQueryDto`'s own defaults produce server-side
 * (page 1, pageSize 50, per `DEFAULT_PAGE_SIZE` in the backend's own
 * `pagination.util.ts`). Search, asset-class/status filtering, and
 * paging past page 1 are not achievable through this endpoint as
 * currently coded, and the Instruments page's copy says so rather than
 * offering controls that would silently 400.
 */
export function useInstruments() {
  return useQuery({
    queryKey: ["market-data", "instruments"],
    queryFn: () => api.get<PaginatedResult<Instrument>>("/market-data/instruments"),
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
  return useQuery({ queryKey: ["market-data", "exchanges"], queryFn: () => api.get<Exchange[]>("/market-data/exchanges") });
}
