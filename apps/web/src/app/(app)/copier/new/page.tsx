"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  Copy,
  Save,
  ShieldCheck,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@rmsm/ui";
import { useSessionStore } from "@/lib/session-store";
import { useTradingAccounts } from "@/features/trading/hooks/use-trading-accounts";
import { useCreateCopyGroup } from "@/features/copier/hooks";

export default function CreateCopyGroupPage() {
  const router = useRouter();

  const organizationId =
    useSessionStore((state) => state.organizationId) ??
    undefined;

  const [name, setName] = useState("");
  const [masterAccountId, setMasterAccountId] = useState("");

  const accountsQuery = useTradingAccounts(organizationId);
  const createGroup = useCreateCopyGroup(organizationId);

  const accounts = accountsQuery.data ?? [];

  const eligibleSourceAccounts = accounts.filter(
    (account) => account.status === "ACTIVE",
  );

  const handleCreate = () => {
    const trimmedName = name.trim();

    if (!trimmedName || !masterAccountId) {
      return;
    }

    createGroup.mutate(
      {
        name: trimmedName,
        masterAccountId,
      },
      {
        onSuccess: (group) => {
          router.push(`/copier/${group.id}`);
        },
      },
    );
  };

  return (
    <div className="rmsm-mobile-glass-page mx-auto w-full max-w-4xl space-y-5 pb-8">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/copier">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>

        <div>
          <h1 className="text-2xl font-semibold">
            Create Copy Group
          </h1>

          <p className="text-muted-foreground text-sm">
            Define the source account and copier configuration.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5 text-primary" />
            Group Configuration
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="copy-group-name">
              Group Name
            </Label>

            <Input
              id="copy-group-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="e.g. NAS100 RDSE Copier"
            />
          </div>

          <div className="space-y-2">
            <Label>Source Account</Label>

            <Select
              value={masterAccountId}
              onValueChange={setMasterAccountId}
              disabled={
                accountsQuery.isLoading ||
                accountsQuery.isError ||
                eligibleSourceAccounts.length === 0
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    accountsQuery.isLoading
                      ? "Loading accounts..."
                      : "Select source account"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {eligibleSourceAccounts.map((account) => (
                  <SelectItem
                    key={account.id}
                    value={account.id}
                  >
                    {account.name}
                    {account.brokerConnectionId
                      ? " — Broker Connected"
                      : " — No Broker"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!accountsQuery.isLoading &&
              !accountsQuery.isError &&
              eligibleSourceAccounts.length === 0 && (
                <p className="text-muted-foreground text-xs">
                  No active trading accounts are available.
                </p>
              )}
          </div>

          <div className="space-y-2">
            <Label>Execution Mode</Label>

            <Select defaultValue="risk">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="risk">
                  Risk Scaled
                </SelectItem>

                <SelectItem value="fixed">
                  Fixed Quantity
                </SelectItem>
              </SelectContent>
            </Select>

            <p className="text-muted-foreground text-xs">
              Execution mode will be configured through follower
              quantity rules after the group is created.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />

              <div>
                <p className="text-sm font-medium">
                  Execution safety
                </p>

                <p className="text-muted-foreground mt-1 text-xs">
                  Broker mappings, account permissions and risk
                  limits must be validated before live copier
                  execution.
                </p>
              </div>
            </div>
          </div>

          {createGroup.isError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              {createGroup.error instanceof Error
                ? createGroup.error.message
                : "Unable to create copy group."}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button asChild variant="outline">
              <Link href="/copier">
                Cancel
              </Link>
            </Button>

            <Button
              className="gap-2"
              disabled={
                !name.trim() ||
                !masterAccountId ||
                createGroup.isPending
              }
              onClick={handleCreate}
            >
              <Save className="h-4 w-4" />
              {createGroup.isPending
                ? "Creating..."
                : "Create Group"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
