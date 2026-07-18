"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpDown, Copy, FolderInput, MoreHorizontal, Plus, Search as SearchIcon } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@rmsm/ui";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { ConfirmDialog } from "@/components/ui-extra/confirm-dialog";
import { TablePagination } from "@/components/ui-extra/table-pagination";
import { StrategyStatusBadge } from "@/components/strategy/status-badges";
import { useArchiveStrategy, useCloneStrategy, useStrategies } from "@/hooks/use-strategies";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { STRATEGY_CATEGORIES, type Strategy, type StrategyCategory, type StrategyStatus } from "@/types/strategy";
import { toast } from "@rmsm/ui";

type SortKey = "name" | "createdAt" | "category";

export function StrategyTable({ initialSearchText = "" }: { initialSearchText?: string }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [status, setStatus] = useState<StrategyStatus | "ALL">("ACTIVE");
  const [category, setCategory] = useState<StrategyCategory | "ALL">("ALL");
  const [searchText, setSearchText] = useState(initialSearchText);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [cloneTarget, setCloneTarget] = useState<Strategy | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Strategy | null>(null);
  const [cloneName, setCloneName] = useState("");

  const query = useStrategies({
    status: status === "ALL" ? undefined : status,
    category: category === "ALL" ? undefined : category,
    searchText: useDebouncedValue(searchText, 300) || undefined,
    page,
    pageSize,
  });

  const archiveMutation = useArchiveStrategy();
  const cloneMutation = useCloneStrategy();

  const sortedRows = useMemo(() => {
    const rows = query.data?.data ?? [];
    const copy = [...rows];
    copy.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "category") return a.category.localeCompare(b.category) * dir;
      return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
    });
    return copy;
  }, [query.data, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function handleArchiveConfirm() {
    if (!archiveTarget) return;
    archiveMutation.mutate(archiveTarget.id, {
      onSuccess: () => {
        toast.success(`"${archiveTarget.name}" archived.`);
        setArchiveTarget(null);
      },
      onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to archive strategy."),
    });
  }

  function handleCloneConfirm() {
    if (!cloneTarget || !cloneName.trim()) return;
    cloneMutation.mutate(
      { strategyId: cloneTarget.id, newName: cloneName.trim() },
      {
        onSuccess: (created) => {
          toast.success(`Cloned as "${created.name}".`);
          setCloneTarget(null);
          router.push(`/strategies/${created.id}`);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to clone strategy."),
      },
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <SearchIcon className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchText}
            onChange={(e) => {
              setSearchText(e.target.value);
              setPage(1);
            }}
            placeholder="Search strategies by name…"
            aria-label="Search strategies"
            className="pl-8"
          />
        </div>

        <Select
          value={status}
          onValueChange={(v: StrategyStatus | "ALL") => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={category}
          onValueChange={(v: StrategyCategory | "ALL") => {
            setCategory(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-52" aria-label="Filter by category">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All categories</SelectItem>
            {STRATEGY_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button asChild className="ml-auto">
          <Link href="/strategies/new">
            <Plus /> New Strategy
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border">
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <EmptyState title="Couldn't load strategies" description={query.error instanceof Error ? query.error.message : "Unknown error"} />
        ) : sortedRows.length === 0 ? (
          <EmptyState
            title="No strategies found"
            description="Try a different search or filter, or create a new strategy."
            action={
              <Button asChild size="sm">
                <Link href="/strategies/new">
                  <Plus /> New Strategy
                </Link>
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton label="Name" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
                  </TableHead>
                  <TableHead>
                    <SortButton label="Category" active={sortKey === "category"} dir={sortDir} onClick={() => toggleSort("category")} />
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>
                    <SortButton label="Created" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
                  </TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Link href={`/strategies/${s.id}`} className="font-medium hover:underline">
                        {s.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.category.replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <StrategyStatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">{s.tags.length > 0 ? s.tags.join(", ") : "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" aria-label={`Actions for "${s.name}"`}>
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/strategies/${s.id}`}>View details</Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setCloneTarget(s);
                              setCloneName(`${s.name} (copy)`);
                            }}
                          >
                            <Copy className="size-4" /> Clone
                          </DropdownMenuItem>
                          {s.status === "ACTIVE" && (
                            <DropdownMenuItem destructive onSelect={() => setArchiveTarget(s)}>
                              <FolderInput className="size-4" /> Archive
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {query.data && <TablePagination pagination={query.data.pagination} onPageChange={setPage} />}
          </>
        )}
      </div>

      <ConfirmDialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
        title="Archive strategy?"
        description={`"${archiveTarget?.name}" will be archived. The strategy has no hard delete — you can find it again by filtering for archived strategies.`}
        confirmLabel="Archive"
        destructive
        loading={archiveMutation.isPending}
        onConfirm={handleArchiveConfirm}
      />

      <ConfirmDialog
        open={!!cloneTarget}
        onOpenChange={(open) => !open && setCloneTarget(null)}
        title="Clone strategy"
        description={
          <div className="space-y-2 text-left">
            <p>Create a copy of &quot;{cloneTarget?.name}&quot; with its latest version&apos;s rules.</p>
            <Input value={cloneName} onChange={(e) => setCloneName(e.target.value)} placeholder="New strategy name" aria-label="New strategy name" />
          </div>
        }
        confirmLabel="Clone"
        loading={cloneMutation.isPending}
        onConfirm={handleCloneConfirm}
      />
    </div>
  );
}

function SortButton({ label, active, dir, onClick }: { label: string; active: boolean; dir: "asc" | "desc"; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-1 font-medium hover:text-foreground" aria-label={`Sort by ${label}`}>
      {label}
      <ArrowUpDown className={active ? "size-3.5 opacity-100" : "size-3.5 opacity-30"} aria-hidden="true" />
      <span className="sr-only">{active ? (dir === "asc" ? "ascending" : "descending") : ""}</span>
    </button>
  );
}
