"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Pause,
  Play,
  Plus,
  Save,
  ShieldCheck,
  UserPlus,
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
  Switch,
} from "@rmsm/ui";
import { useSessionStore } from "@/lib/session-store";
import { useTradingAccounts } from "@/features/trading/hooks/use-trading-accounts";
import {
  useAddCopyGroupMember,
  useCopyGroup,
  useUpdateCopyGroup,
  useUpdateCopyGroupMember,
  useUpdateCopyRule,
} from "@/features/copier/hooks";

export default function CopyGroupDetailPage() {
  const params = useParams<{ groupId: string }>();
  const groupId = params.groupId;

  const organizationId =
    useSessionStore((state) => state.organizationId) ??
    undefined;

  const groupQuery = useCopyGroup(
    organizationId,
    groupId,
  );

  const accountsQuery =
    useTradingAccounts(organizationId);

  const updateGroup =
    useUpdateCopyGroup(organizationId);

  const addMember =
    useAddCopyGroupMember(organizationId);

  const updateMember =
    useUpdateCopyGroupMember(organizationId);

  const updateRule =
    useUpdateCopyRule(organizationId);

  const [selectedAccountId, setSelectedAccountId] =
    useState("");

  const [quantityMultiplier, setQuantityMultiplier] =
    useState("1");

  const [fixedQuantity, setFixedQuantity] =
    useState("");

  const [maxQuantity, setMaxQuantity] =
    useState("");

  if (groupQuery.isLoading) {
    return (
      <div className="mx-auto w-full max-w-6xl p-6">
        <p className="text-muted-foreground text-sm">
          Loading copy group...
        </p>
      </div>
    );
  }

  if (groupQuery.isError || !groupQuery.data) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4 p-6">
        <Button asChild variant="ghost">
          <Link href="/copier">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Copier
          </Link>
        </Button>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-destructive">
              Unable to load this copy group.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const group = groupQuery.data;
  const accounts = accountsQuery.data ?? [];

  const followerMembers = group.members.filter(
    (member) => member.role === "FOLLOWER",
  );

  const memberAccountIds = new Set(
    group.members.map(
      (member) => member.tradingAccountId,
    ),
  );

  const availableFollowers = accounts.filter(
    (account) =>
      account.status === "ACTIVE" &&
      account.brokerConnectionId &&
      account.brokerAccountId &&
      !memberAccountIds.has(account.id) &&
      account.id !== group.masterAccountId,
  );

  const handleAddFollower = () => {
    if (!selectedAccountId) {
      return;
    }

    addMember.mutate(
      {
        groupId,
        input: {
          tradingAccountId: selectedAccountId,
          role: "FOLLOWER",
          quantityMultiplier,
          fixedQuantity:
            fixedQuantity.trim() || undefined,
          maxQuantity:
            maxQuantity.trim() || undefined,
          enabled: true,
        },
      },
      {
        onSuccess: () => {
          setSelectedAccountId("");
          setQuantityMultiplier("1");
          setFixedQuantity("");
          setMaxQuantity("");
        },
      },
    );
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 pb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/copier">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-primary" />

              <h1 className="text-2xl font-semibold">
                {group.name}
              </h1>
            </div>

            <p className="text-muted-foreground text-sm">
              Source: {group.masterAccount.name}
            </p>
          </div>
        </div>

        <Button
          variant={
            group.status === "ACTIVE"
              ? "outline"
              : "default"
          }
          disabled={updateGroup.isPending}
          onClick={() =>
            updateGroup.mutate({
              groupId,
              status:
                group.status === "ACTIVE"
                  ? "PAUSED"
                  : "ACTIVE",
            })
          }
        >
          {group.status === "ACTIVE" ? (
            <>
              <Pause className="mr-2 h-4 w-4" />
              Pause Group
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Activate Group
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">
              Status
            </p>

            <div className="mt-2 flex items-center gap-2">
              {group.status === "ACTIVE" ? (
                <CheckCircle2 className="h-4 w-4 text-primary" />
              ) : (
                <Pause className="h-4 w-4 text-muted-foreground" />
              )}

              <span className="font-medium">
                {group.status}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">
              Source Account
            </p>

            <p className="mt-2 font-medium">
              {group.masterAccount.name}
            </p>

            <p className="text-muted-foreground text-xs">
              {group.masterAccount.brokerConnectionId
                ? "Broker Connected"
                : "No Broker"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-muted-foreground text-xs">
              Followers
            </p>

            <p className="mt-2 text-2xl font-semibold">
              {followerMembers.length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Source
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium">
                  {group.masterAccount.name}
                </p>

                <p className="text-muted-foreground text-xs">
                  {group.masterAccount.brokerConnectionId
                    ? "Broker Connected"
                    : "No broker connection"}
                </p>
              </div>

              <span className="rounded-full border px-2.5 py-1 text-xs font-medium">
                MASTER
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Add Follower
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-5">
          {availableFollowers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5">
              <p className="font-medium text-sm">
                No executable follower accounts available.
              </p>

              <p className="text-muted-foreground mt-1 text-xs">
                A follower must be ACTIVE and have both a
                broker connection and broker account.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Follower Account</Label>

                <Select
                  value={selectedAccountId}
                  onValueChange={setSelectedAccountId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select follower account" />
                  </SelectTrigger>

                  <SelectContent>
                    {availableFollowers.map((account) => (
                      <SelectItem
                        key={account.id}
                        value={account.id}
                      >
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Quantity Multiplier</Label>

                  <Input
                    value={quantityMultiplier}
                    onChange={(event) =>
                      setQuantityMultiplier(
                        event.target.value,
                      )
                    }
                    inputMode="decimal"
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Fixed Quantity</Label>

                  <Input
                    value={fixedQuantity}
                    onChange={(event) =>
                      setFixedQuantity(event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Max Quantity</Label>

                  <Input
                    value={maxQuantity}
                    onChange={(event) =>
                      setMaxQuantity(event.target.value)
                    }
                    inputMode="decimal"
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Button
                className="gap-2"
                disabled={
                  !selectedAccountId ||
                  addMember.isPending
                }
                onClick={handleAddFollower}
              >
                <Plus className="h-4 w-4" />
                {addMember.isPending
                  ? "Adding..."
                  : "Add Follower"}
              </Button>
            </>
          )}

          {addMember.isError && (
            <p className="text-sm text-destructive">
              {addMember.error instanceof Error
                ? addMember.error.message
                : "Unable to add follower."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Followers</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {followerMembers.length === 0 ? (
            <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">
              No followers configured yet.
            </div>
          ) : (
            followerMembers.map((member) => (
              <FollowerCard
                key={member.id}
                member={member}
                onUpdate={(input) =>
                  updateMember.mutate({
                    groupId,
                    memberId: member.id,
                    input,
                  })
                }
                onRuleUpdate={(input) =>
                  updateRule.mutate({
                    groupId,
                    memberId: member.id,
                    input,
                  })
                }
                saving={
                  updateMember.isPending ||
                  updateRule.isPending
                }
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function FollowerCard({
  member,
  onUpdate,
  onRuleUpdate,
  saving,
}: {
  member: {
    id: string;
    tradingAccount: {
      name: string;
      brokerConnectionId: string | null;
      brokerAccountId: string | null;
    };
    quantityMultiplier: string;
    fixedQuantity: string | null;
    maxQuantity: string | null;
    enabled: boolean;
    rule: {
      copyEntries: boolean;
      copyExits: boolean;
      copyStopLoss: boolean;
      copyTakeProfit: boolean;
      copyLimitOrders: boolean;
      copyStopOrders: boolean;
      enabled: boolean;
    } | null;
  };
  onUpdate: (input: {
    quantityMultiplier?: string;
    fixedQuantity?: string | null;
    maxQuantity?: string | null;
    enabled?: boolean;
  }) => void;
  onRuleUpdate: (input: Record<string, boolean>) => void;
  saving: boolean;
}) {
  const [multiplier, setMultiplier] = useState(
    member.quantityMultiplier,
  );

  const [fixed, setFixed] = useState(
    member.fixedQuantity ?? "",
  );

  const [max, setMax] = useState(
    member.maxQuantity ?? "",
  );

  const rule = member.rule;

  return (
    <div className="rounded-lg border p-4 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {member.tradingAccount.name}
          </p>

          <p className="text-muted-foreground text-xs">
            {member.tradingAccount.brokerConnectionId
              ? "Broker Connected"
              : "No Broker"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs">
            Enabled
          </Label>

          <Switch
            checked={member.enabled}
            onCheckedChange={(enabled) =>
              onUpdate({ enabled })
            }
            disabled={saving}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Quantity Multiplier</Label>

          <Input
            value={multiplier}
            onChange={(event) =>
              setMultiplier(event.target.value)
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Fixed Quantity</Label>

          <Input
            value={fixed}
            onChange={(event) =>
              setFixed(event.target.value)
            }
            placeholder="Optional"
          />
        </div>

        <div className="space-y-2">
          <Label>Max Quantity</Label>

          <Input
            value={max}
            onChange={(event) =>
              setMax(event.target.value)
            }
            placeholder="Optional"
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={saving}
        onClick={() =>
          onUpdate({
            quantityMultiplier: multiplier,
            fixedQuantity:
              fixed.trim() || null,
            maxQuantity:
              max.trim() || null,
          })
        }
      >
        <Save className="h-4 w-4" />
        Save Quantity Rules
      </Button>

      <div className="border-t pt-4">
        <p className="mb-3 text-sm font-medium">
          Copy Rules
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <RuleToggle
            label="Copy Entries"
            checked={rule?.copyEntries ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyEntries: value,
              })
            }
          />

          <RuleToggle
            label="Copy Exits"
            checked={rule?.copyExits ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyExits: value,
              })
            }
          />

          <RuleToggle
            label="Copy Stop Loss"
            checked={rule?.copyStopLoss ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyStopLoss: value,
              })
            }
          />

          <RuleToggle
            label="Copy Take Profit"
            checked={rule?.copyTakeProfit ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyTakeProfit: value,
              })
            }
          />

          <RuleToggle
            label="Copy Limit Orders"
            checked={rule?.copyLimitOrders ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyLimitOrders: value,
              })
            }
          />

          <RuleToggle
            label="Copy Stop Orders"
            checked={rule?.copyStopOrders ?? true}
            disabled={saving}
            onChange={(value) =>
              onRuleUpdate({
                copyStopOrders: value,
              })
            }
          />
        </div>
      </div>
    </div>
  );
}

function RuleToggle({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <Label className="text-sm">
        {label}
      </Label>

      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}
