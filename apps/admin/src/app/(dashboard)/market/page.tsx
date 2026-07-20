"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge, Tabs, TabsList, TabsTrigger, TabsContent } from "@rmsm/ui";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { useExchanges, useSymbols } from "@/features/market/hooks/use-market";
import type { Exchange, MarketSymbol } from "@/features/market/types";

const exchangeColumns: ColumnDef<Exchange, unknown>[] = [
  { accessorKey: "name", header: "Name" },
  { accessorKey: "type", header: "Type" },
  { accessorKey: "country", header: "Country" },
  { accessorKey: "timezone", header: "Timezone" },
  {
    accessorKey: "isOpen",
    header: "Trading Hours",
    cell: ({ row }) => <Badge variant={row.original.isOpen ? "success" : "secondary"}>{row.original.isOpen ? "Open" : "Closed"}</Badge>,
  },
];

const symbolColumns: ColumnDef<MarketSymbol, unknown>[] = [
  { accessorKey: "code", header: "Symbol" },
  { accessorKey: "description", header: "Description" },
  { accessorKey: "assetClass", header: "Asset Class" },
  { accessorKey: "instrumentType", header: "Instrument" },
  { accessorKey: "baseCurrency", header: "Base" },
  { accessorKey: "quoteCurrency", header: "Quote" },
  { accessorKey: "precision", header: "Precision" },
];

export default function MarketPage() {
  const exchanges = useExchanges();
  const symbols = useSymbols();

  return (
    <div>
      <PageHeader title="Market Administration" description="Exchanges, trading sessions, and tradable symbols." />

      <Tabs defaultValue="exchanges">
        <TabsList>
          <TabsTrigger value="exchanges">Exchanges &amp; Sessions</TabsTrigger>
          <TabsTrigger value="symbols">Symbols</TabsTrigger>
        </TabsList>
        <TabsContent value="exchanges" className="mt-4">
          <DataTable
            columns={exchangeColumns}
            data={exchanges.data?.items}
            isLoading={exchanges.isLoading}
            error={exchanges.error}
            onRetry={() => exchanges.refetch()}
            emptyTitle="No exchanges configured"
          />
        </TabsContent>
        <TabsContent value="symbols" className="mt-4">
          <DataTable
            columns={symbolColumns}
            data={symbols.data?.items}
            isLoading={symbols.isLoading}
            error={symbols.error}
            onRetry={() => symbols.refetch()}
            emptyTitle="No symbols configured"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
