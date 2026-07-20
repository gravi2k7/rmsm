"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, ArrowUpDown, ListOrdered } from "lucide-react";
import { Input, Tabs, TabsList, TabsTrigger, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Skeleton, Alert, AlertDescription } from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { TablePagination } from "@/components/ui-extra/table-pagination";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useOrders } from "@/features/execution/hooks/use-execution";
import { CreateOrderDialog } from "@/features/execution/components/create-order-dialog";
import { StatusBadge } from "@/components/shared/status-badge";
import { paginateClientSide } from "@/lib/paginate-client-side";
import type { Order } from "@/features/execution/types";

type TabKey = "open" | "pending" | "executed" | "cancelled" | "rejected";
type SortKey = "createdAt" | "quantityUnits";
const PAGE_SIZE = 20;

const TAB_STATUSES: Record<TabKey, Order["status"][]> = {
  open: ["ACCEPTED", "PARTIALLY_FILLED"],
  pending: ["PENDING", "SUBMITTED"],
  executed: ["FILLED"],
  cancelled: ["CANCELLED", "EXPIRED"],
  rejected: ["REJECTED"],
};

export default function OrderManagementPage() {
  const ordersQuery = useOrders();
  const [tab, setTab] = useState<TabKey>("open");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const filtered = useMemo(() => {
    const all = ordersQuery.data?.items ?? [];
    const statuses = TAB_STATUSES[tab];
    const q = debouncedSearch.trim().toUpperCase();
    return all.filter((o) => statuses.includes(o.status) && (!q || o.symbolCode.toUpperCase().includes(q)));
  }, [ordersQuery.data, tab, debouncedSearch]);

  const sorted = useMemo(() => {
    const copy = [...filtered];
    const dir = sortDir === "asc" ? 1 : -1;
    copy.sort((a, b) =>
      sortKey === "quantityUnits" ? (a.quantityUnits - b.quantityUnits) * dir : (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir,
    );
    return copy;
  }, [filtered, sortKey, sortDir]);

  const { pageItems, meta } = paginateClientSide(sorted, page, PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Order Management</h1>
          <p className="text-sm text-muted-foreground">All orders placed against approved decisions.</p>
        </div>
        <CreateOrderDialog />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as TabKey);
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="open">Open</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="executed">Executed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-[200px]">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by symbol…"
            className="pl-8"
            aria-label="Search orders"
          />
        </div>
      </div>

      {ordersQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load orders. Please try again.</AlertDescription>
        </Alert>
      )}

      {ordersQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : pageItems.length === 0 ? (
        <EmptyState icon={<ListOrdered className="h-8 w-8" />} title="No orders in this category" />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Side</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1 font-medium" onClick={() => toggleSort("quantityUnits")}>
                    Quantity <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </TableHead>
                <TableHead>Filled</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>
                  <button type="button" className="flex items-center gap-1 font-medium" onClick={() => toggleSort("createdAt")}>
                    Created <ArrowUpDown className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                  </button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageItems.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                      {o.symbolCode}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={o.side === "BUY" ? "success" : "destructive"}>{o.side}</Badge>
                  </TableCell>
                  <TableCell>{o.type.replace(/_/g, " ")}</TableCell>
                  <TableCell>
                    <StatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="tabular-nums">{o.quantityUnits.toLocaleString()}</TableCell>
                  <TableCell className="tabular-nums text-sm text-muted-foreground">
                    {o.filledQuantityUnits.toLocaleString()} / {o.quantityUnits.toLocaleString()}
                  </TableCell>
                  <TableCell className="tabular-nums">{o.averageFillPrice ?? o.limitPrice ?? o.stopPrice ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination pagination={meta} onPageChange={setPage} />
        </div>
      )}
    </div>
  );
}
