"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  Link2,
  Plus,
  Search,
  Server,
  Settings2,
  TestTube2,
  Users,
  X,
} from "lucide-react";
import {
  Badge,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rmsm/ui";
import { useSessionStore } from "@/lib/session-store";
import {
  createBrokerConnection,
  listBrokerConnections,
  testBrokerConnection,
} from "@/features/brokers/api";
import type {
  BrokerAccount,
  BrokerConnection,
  BrokerProvider,
} from "@/features/brokers/types";
import { ApiError } from "@/lib/api-client";

const PROVIDERS = [
  {
    id: "MT5" as const,
    name: "MetaTrader 5",
    description: "Connect MT5 accounts and trade through RMSM.",
    accent: "from-emerald-500/20 to-cyan-500/10",
  },
  {
    id: "CTRADER" as const,
    name: "cTrader",
    description: "Connect cTrader accounts and manage mappings.",
    accent: "from-blue-500/20 to-cyan-500/10",
  },
  {
    id: "PROJECTX" as const,
    name: "ProjectX",
    description: "Connect ProjectX trading accounts.",
    accent: "from-violet-500/20 to-fuchsia-500/10",
  },
];

export function BrokersPage() {
  const organizationId = useSessionStore((state) => state.organizationId);

  const [showAdd, setShowAdd] = useState(false);
  const [provider, setProvider] = useState<BrokerProvider>("MT5");
  const [search, setSearch] = useState("");
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Record<string, BrokerAccount[]>>({});
  const [testingId, setTestingId] = useState<string | null>(null);

  const loadConnections = useCallback(async () => {
    if (!organizationId) {
      setConnections([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const result = await listBrokerConnections(organizationId);
      setConnections(result);
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Unable to load broker connections.",
      );
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const handleTest = async (connectionId: string) => {
    if (!organizationId) return;

    setTestingId(connectionId);
    setLoadError(null);

    try {
      const result = await testBrokerConnection(
        organizationId,
        connectionId,
      );

      setAccounts((current) => ({
        ...current,
        [connectionId]: result.accounts,
      }));

      await loadConnections();
    } catch (error) {
      setLoadError(
        error instanceof ApiError
          ? error.message
          : "Broker connection test failed.",
      );
    } finally {
      setTestingId(null);
    }
  };

  const handleCreated = async (connectionId: string) => {
    setShowAdd(false);
    await loadConnections();
    await handleTest(connectionId);
  };

  const filtered = connections.filter((connection) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      connection.name.toLowerCase().includes(query) ||
      connection.provider.toLowerCase().includes(query) ||
      connection.status.toLowerCase().includes(query)
    );
  });

  return (
    <div className="rmsm-mobile-glass-page w-full min-w-0 space-y-5 overflow-x-hidden pb-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Link2 className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Brokers</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Connect external trading accounts to RMSM, manage accounts and
              map instruments.
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setProvider("MT5");
            setShowAdd(true);
          }}
          className="w-full gap-2 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add Broker
        </Button>
      </div>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-r from-primary/10 via-card to-card">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Server className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-semibold">Trade Without Limits</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Connect MetaTrader 5, cTrader or ProjectX accounts and manage
                them directly from RMSM.
              </p>
            </div>
          </div>

          <span className="flex items-center gap-1 text-sm font-medium text-primary">
            Broker connections
            <ArrowRight className="h-4 w-4" />
          </span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {PROVIDERS.map((item) => {
          const available = item.id !== "CTRADER";

          return (
            <Card
              key={item.id}
              className={`overflow-hidden bg-gradient-to-br ${item.accent}`}
            >
              <CardContent className="p-5">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border bg-background/70 text-lg font-bold">
                    {item.id === "MT5"
                      ? "M5"
                      : item.id === "CTRADER"
                        ? "cT"
                        : "PX"}
                  </div>

                  <div>
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-muted-foreground text-xs">
                      {item.description}
                    </p>
                  </div>
                </div>

                <Button
                  variant={item.id === "PROJECTX" ? "secondary" : "default"}
                  disabled={!available}
                  className="w-full gap-2"
                  onClick={() => {
                    if (!available) return;
                    setProvider(item.id);
                    setShowAdd(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  {available ? `Connect ${item.name}` : "Coming Soon"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader className="gap-4 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Your Broker Connections</CardTitle>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage broker connections, accounts and instrument mappings.
              </p>
            </div>

            <div className="relative w-full lg:w-72">
              <Search className="text-muted-foreground pointer-events-none absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search connections..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-0 pb-0">
          {loadError && (
            <div className="border-t px-6 py-3 text-sm text-destructive">
              {loadError}
            </div>
          )}

          {loading ? (
            <div className="border-t px-6 py-14 text-center text-sm text-muted-foreground">
              Loading broker connections...
            </div>
          ) : filtered.length === 0 ? (
            <div className="border-t px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Link2 className="h-5 w-5 text-muted-foreground" />
              </div>

              <h3 className="mt-4 font-medium">
                {search
                  ? "No matching connections"
                  : "No broker connections yet"}
              </h3>

              <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
                {search
                  ? "Try another search term."
                  : "Connect your first broker to manage external accounts and instrument mappings from RMSM."}
              </p>

              {!search && (
                <Button
                  className="mt-5 gap-2"
                  onClick={() => {
                    setProvider("MT5");
                    setShowAdd(true);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Broker
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Accounts</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filtered.map((connection) => {
                    const brokerAccounts = accounts[connection.id] ?? [];

                    return (
                      <TableRow key={connection.id}>
                        <TableCell>
                          <div className="font-medium">{connection.name}</div>

                          {connection.lastConnectionTestStatus && (
                            <div className="mt-1 max-w-xs truncate text-xs text-muted-foreground">
                              {connection.lastConnectionTestStatus}
                            </div>
                          )}
                        </TableCell>

                        <TableCell>{connection.provider}</TableCell>

                        <TableCell>
                          <Badge
                            variant={
                              connection.status === "ACTIVE"
                                ? "success"
                                : connection.status === "ERROR"
                                  ? "destructive"
                                  : "secondary"
                            }
                          >
                            {connection.status}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          {brokerAccounts.length > 0
                            ? brokerAccounts.length
                            : "—"}
                        </TableCell>

                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={testingId === connection.id}
                            onClick={() => void handleTest(connection.id)}
                          >
                            {testingId === connection.id
                              ? "Testing..."
                              : "Test Connection"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <QuickCard
          icon={<Plus className="h-5 w-5" />}
          title="Add Broker"
          description="Connect a new external broker account."
          onClick={() => {
            setProvider("MT5");
            setShowAdd(true);
          }}
        />

        <QuickCard
          icon={<Users className="h-5 w-5" />}
          title="Manage Accounts"
          description="View and bind broker accounts to RMSM."
        />

        <QuickCard
          icon={<Settings2 className="h-5 w-5" />}
          title="Instrument Mappings"
          description="Map RMSM instruments to broker symbols."
        />
      </div>

      {showAdd && (
        <AddBrokerOverlay
          provider={provider}
          onProviderChange={setProvider}
          organizationId={organizationId}
          onCreated={handleCreated}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

function QuickCard({
  icon,
  title,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={
        onClick
          ? "cursor-pointer transition-colors hover:border-primary/40"
          : undefined
      }
      onClick={onClick}
    >
      <CardContent className="flex gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </div>

        <div>
          <h3 className="font-medium">{title}</h3>
          <p className="text-muted-foreground mt-1 text-xs">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AddBrokerOverlay({
  provider,
  onProviderChange,
  organizationId,
  onCreated,
  onClose,
}: {
  provider: BrokerProvider;
  onProviderChange: (provider: BrokerProvider) => void;
  organizationId: string | null;
  onCreated: (connectionId: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    !submitting &&
    !!organizationId &&
    !!name.trim() &&
    ((provider === "MT5" &&
      !!login.trim() &&
      !!password &&
      !!server.trim()) ||
      (provider === "PROJECTX" && !!username.trim() && !!apiKey));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h2 className="font-semibold">Add Broker</h2>
            <p className="text-muted-foreground text-xs">
              Credentials are handled securely by RMSM.
            </p>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-5 p-5">
          <div className="space-y-2">
            <Label>Provider</Label>

            <Select
              value={provider}
              onValueChange={(value) =>
                onProviderChange(value as BrokerProvider)
              }
              disabled={submitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="MT5">MetaTrader 5</SelectItem>
                <SelectItem value="PROJECTX">ProjectX</SelectItem>
                <SelectItem value="CTRADER" disabled>
                  cTrader — Coming Soon
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Pepperstone MT5 Demo"
              disabled={submitting}
            />
          </div>

          {provider === "MT5" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field
                label="Login"
                value={login}
                onChange={setLogin}
                disabled={submitting}
              />

              <Field
                label="Server"
                value={server}
                onChange={setServer}
                placeholder="Broker-Demo"
                disabled={submitting}
              />

              <div className="sm:col-span-2">
                <Field
                  label="Password"
                  value={password}
                  onChange={setPassword}
                  type="password"
                  disabled={submitting}
                />
              </div>
            </div>
          )}

          {provider === "PROJECTX" && (
            <div className="space-y-4">
              <Field
                label="Username"
                value={username}
                onChange={setUsername}
                disabled={submitting}
              />

              <Field
                label="API Key"
                value={apiKey}
                onChange={setApiKey}
                type="password"
                disabled={submitting}
              />
            </div>
          )}

          {provider === "CTRADER" && (
            <div className="rounded-lg border border-dashed p-4">
              <div className="flex gap-3">
                <CircleHelp className="h-5 w-5 shrink-0 text-primary" />

                <div>
                  <p className="text-sm font-medium">cTrader connection</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    cTrader broker connection creation is not available in the
                    current API yet.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
            <TestTube2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />

            <p className="text-muted-foreground text-xs">
              Credentials are sent only during connection creation. RMSM
              encrypts stored broker credentials and does not return them from
              the connection list.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>

            <Button
              disabled={!canSubmit}
              className="gap-2"
              onClick={async () => {
                if (!organizationId) {
                  setError("No active organization is available.");
                  return;
                }

                setSubmitting(true);
                setError(null);

                try {
                  const connection = await createBrokerConnection(
                    organizationId,
                    {
                      provider,
                      name: name.trim(),
                      ...(provider === "MT5"
                        ? {
                            login: login.trim(),
                            password,
                            server: server.trim(),
                          }
                        : {
                            username: username.trim(),
                            apiKey,
                          }),
                    },
                  );

                  setName("");
                  setLogin("");
                  setPassword("");
                  setServer("");
                  setUsername("");
                  setApiKey("");

                  await onCreated(connection.id);
                } catch (error) {
                  setError(
                    error instanceof ApiError
                      ? error.message
                      : "Unable to create broker connection.",
                  );
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Connecting..." : "Test & Connect"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}
