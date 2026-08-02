"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { LoadingState, ErrorState } from "@/components/shared/data-states";
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label, Switch, toast } from "@rmsm/ui";
import { useBillingSettings, useUpsertBillingSetting } from "@/features/billing-settings/hooks/use-billing-settings";
import { ApiError } from "@/lib/api-client";

const KEYS = {
  currency: "billing.currency",
  taxRate: "billing.tax_rate_percent",
  invoicePrefix: "billing.invoice_prefix",
  automaticRenewals: "billing.automatic_renewals",
  gracePeriodDays: "billing.grace_period_days",
} as const;

export default function BillingSettingsPage() {
  const settings = useBillingSettings();
  const upsert = useUpsertBillingSetting();

  const [currency, setCurrency] = useState("USD");
  const [taxRate, setTaxRate] = useState("0");
  const [invoicePrefix, setInvoicePrefix] = useState("INV-");
  const [automaticRenewals, setAutomaticRenewals] = useState(true);
  const [gracePeriodDays, setGracePeriodDays] = useState("7");

  useEffect(() => {
    if (!settings.data) return;
    const byKey = new Map(settings.data.map((s) => [s.key, s.value]));
    if (byKey.has(KEYS.currency)) setCurrency(String(byKey.get(KEYS.currency)));
    if (byKey.has(KEYS.taxRate)) setTaxRate(String(byKey.get(KEYS.taxRate)));
    if (byKey.has(KEYS.invoicePrefix)) setInvoicePrefix(String(byKey.get(KEYS.invoicePrefix)));
    if (byKey.has(KEYS.automaticRenewals)) setAutomaticRenewals(Boolean(byKey.get(KEYS.automaticRenewals)));
    if (byKey.has(KEYS.gracePeriodDays)) setGracePeriodDays(String(byKey.get(KEYS.gracePeriodDays)));
  }, [settings.data]);

  async function handleSave() {
    try {
      await Promise.all([
        upsert.mutateAsync({ key: KEYS.currency, value: currency, description: "Default platform billing currency" }),
        upsert.mutateAsync({ key: KEYS.taxRate, value: Number(taxRate), description: "Default tax rate (%)" }),
        upsert.mutateAsync({ key: KEYS.invoicePrefix, value: invoicePrefix, description: "Invoice number prefix" }),
        upsert.mutateAsync({ key: KEYS.automaticRenewals, value: automaticRenewals, description: "Automatic subscription renewals enabled" }),
        upsert.mutateAsync({ key: KEYS.gracePeriodDays, value: Number(gracePeriodDays), description: "Default grace period (days) after a failed renewal" }),
      ]);
      toast.success("Billing settings saved.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Failed to save settings.");
    }
  }

  if (settings.isLoading) return <LoadingState rows={5} />;
  if (settings.error) return <ErrorState error={settings.error} onRetry={() => settings.refetch()} />;

  return (
    <div>
      <PageHeader title="Billing Settings" description="Platform-wide billing configuration." actions={<Button onClick={handleSave} disabled={upsert.isPending}>{upsert.isPending ? "Saving…" : "Save Changes"}</Button>} />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxRate">Tax Rate (%)</Label>
                <Input id="taxRate" type="number" min={0} value={taxRate} onChange={(e) => setTaxRate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix</Label>
                <Input id="invoicePrefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gracePeriodDays">Grace Period (days)</Label>
                <Input id="gracePeriodDays" type="number" min={0} value={gracePeriodDays} onChange={(e) => setGracePeriodDays(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Automatic Renewals</p>
                <p className="text-xs text-muted-foreground">Subscriptions renew automatically at the end of each billing cycle.</p>
              </div>
              <Switch checked={automaticRenewals} onCheckedChange={setAutomaticRenewals} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Payment providers (Stripe, Razorpay, Paddle, LemonSqueezy, PayPal, Mock) are selected per-subscription at creation time via the billing
              API and configured through server-side environment/provider credentials — there is no admin endpoint to manage provider configuration, so
              this is informational rather than editable here.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Email Templates</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Billing-related emails (invoices, payment receipts, renewal reminders) are rendered by the Enterprise Email Platform module&apos;s own
              template engine, not the generic platform-settings store — template management belongs to that module&apos;s own admin surface, out of
              scope here.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
