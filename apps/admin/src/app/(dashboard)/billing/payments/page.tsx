"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ScopeBanner } from "@/features/billing-shared/components/scope-banner";
import { formatCents, formatDate } from "@/features/billing-shared/format";
import { exportToCsv } from "@/features/billing-shared/csv-export";
import { Button, Tabs, TabsList, TabsTrigger, TabsContent, Sheet, SheetContent, SheetHeader, SheetTitle } from "@rmsm/ui";
import { usePaymentsFanout, useInvoicesFanout } from "@/features/billing-payments/hooks/use-payments";
import type { Payment, Invoice } from "@/features/billing-shared/types";
import type { Organization } from "@/features/organizations/types";

interface PaymentRow {
  organization: Organization;
  payment: Payment;
}
interface InvoiceRow {
  organization: Organization;
  invoice: Invoice;
}

export default function PaymentsPage() {
  const { rows: paymentFanout, organizationsQuery } = usePaymentsFanout();
  const { rows: invoiceFanout } = useInvoicesFanout();
  const [selectedPayment, setSelectedPayment] = useState<PaymentRow | null>(null);

  const allPayments: PaymentRow[] = useMemo(
    () => paymentFanout.flatMap((r) => (r.data ? r.data.items.map((payment) => ({ organization: r.organization, payment })) : [])),
    [paymentFanout],
  );
  const allInvoices: InvoiceRow[] = useMemo(
    () => invoiceFanout.flatMap((r) => (r.data ? r.data.items.map((invoice) => ({ organization: r.organization, invoice })) : [])),
    [invoiceFanout],
  );

  const failedPayments = allPayments.filter((r) => r.payment.status === "FAILED");
  const refunds = allPayments.filter((r) => r.payment.status === "REFUNDED");

  const paymentColumns: ColumnDef<PaymentRow, unknown>[] = [
    { id: "organization", header: "Organization", cell: ({ row }) => row.original.organization.name },
    { id: "amount", header: "Amount", cell: ({ row }) => formatCents(row.original.payment.amountCents, row.original.payment.currency) },
    { id: "provider", header: "Provider", cell: ({ row }) => row.original.payment.provider },
    { id: "method", header: "Method", cell: ({ row }) => row.original.payment.method ?? "—" },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.payment.status} /> },
    { id: "date", header: "Date", cell: ({ row }) => formatDate(row.original.payment.createdAt) },
  ];

  const invoiceColumns: ColumnDef<InvoiceRow, unknown>[] = [
    { id: "organization", header: "Organization", cell: ({ row }) => row.original.organization.name },
    { id: "number", header: "Invoice #", cell: ({ row }) => row.original.invoice.invoiceNumber },
    { id: "total", header: "Total", cell: ({ row }) => formatCents(row.original.invoice.totalCents, row.original.invoice.currency) },
    { id: "status", header: "Status", cell: ({ row }) => <StatusBadge status={row.original.invoice.status} /> },
    { id: "dueDate", header: "Due Date", cell: ({ row }) => formatDate(row.original.invoice.dueDate) },
    { id: "paymentDate", header: "Paid", cell: ({ row }) => formatDate(row.original.invoice.paymentDate) },
  ];

  function exportRows(rows: PaymentRow[], filename: string) {
    exportToCsv(
      filename,
      rows.map((r) => ({
        organization: r.organization.name,
        amountCents: r.payment.amountCents,
        currency: r.payment.currency,
        provider: r.payment.provider,
        status: r.payment.status,
        createdAt: r.payment.createdAt,
      })),
    );
  }

  const isLoading = organizationsQuery.isLoading || paymentFanout.some((r) => r.isLoading);

  return (
    <div>
      <PageHeader title="Payments" description="Payment history, refunds, failed payments, and invoices." />
      <ScopeBanner />

      <Tabs defaultValue="history">
        <div className="mb-4 flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="history">Payment History</TabsTrigger>
            <TabsTrigger value="refunds">Refunds</TabsTrigger>
            <TabsTrigger value="failed">Failed Payments</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={() => exportRows(allPayments, "payments.csv")}>
            <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
            Export
          </Button>
        </div>

        <TabsContent value="history">
          <DataTable
            columns={paymentColumns}
            data={allPayments}
            isLoading={isLoading}
            error={organizationsQuery.error}
            onRetry={() => organizationsQuery.refetch()}
            onRowClick={(row) => setSelectedPayment(row)}
            emptyTitle="No payments found"
          />
        </TabsContent>
        <TabsContent value="refunds">
          <DataTable columns={paymentColumns} data={refunds} isLoading={isLoading} onRowClick={(row) => setSelectedPayment(row)} emptyTitle="No refunds" />
        </TabsContent>
        <TabsContent value="failed">
          <DataTable
            columns={paymentColumns}
            data={failedPayments}
            isLoading={isLoading}
            onRowClick={(row) => setSelectedPayment(row)}
            emptyTitle="No failed payments"
          />
        </TabsContent>
        <TabsContent value="invoices">
          <DataTable columns={invoiceColumns} data={allInvoices} isLoading={isLoading} emptyTitle="No invoices found" />
        </TabsContent>
      </Tabs>

      <Sheet open={!!selectedPayment} onOpenChange={(open) => !open && setSelectedPayment(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selectedPayment && (
            <>
              <SheetHeader>
                <SheetTitle>Payment Details</SheetTitle>
              </SheetHeader>
              <dl className="mt-6 space-y-4 text-sm">
                <DetailRow label="Organization" value={selectedPayment.organization.name} />
                <DetailRow label="Amount" value={formatCents(selectedPayment.payment.amountCents, selectedPayment.payment.currency)} />
                <DetailRow label="Provider" value={selectedPayment.payment.provider} />
                <DetailRow label="Transaction ID" value={selectedPayment.payment.providerTransactionId ?? "—"} />
                <DetailRow label="Method" value={selectedPayment.payment.method ?? "—"} />
                <DetailRow label="Status" value={<StatusBadge status={selectedPayment.payment.status} />} />
                <DetailRow label="Date" value={formatDate(selectedPayment.payment.createdAt)} />
              </dl>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
