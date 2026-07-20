"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Pencil, Star, Search, GripVertical } from "lucide-react";
import {
  Button,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Label,
  Skeleton,
} from "@rmsm/ui";
import { useWatchlistStore } from "@/features/watchlists/store";
import { useInstruments, useQuotes } from "@/features/market/hooks/use-market-data";
import { toNumber } from "@/features/market/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";

function CreateWatchlistDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createWatchlist = useWatchlistStore((s) => s.createWatchlist);

  function handleCreate() {
    if (!name.trim()) return;
    createWatchlist(name.trim());
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus className="mr-1.5 h-4 w-4" aria-hidden="true" />
        New watchlist
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New watchlist</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="watchlist-name">Name</Label>
          <Input id="watchlist-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Majors" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddSymbolDialog({ watchlistId }: { watchlistId: string }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const addToWatchlist = useWatchlistStore((s) => s.addToWatchlist);
  const instrumentsQuery = useInstruments({ query: debouncedSearch || undefined, pageSize: 15 });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Search className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
        Add symbol
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a symbol</DialogTitle>
        </DialogHeader>
        <Input placeholder="Search symbol or name…" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
        <div className="max-h-72 space-y-1 overflow-y-auto">
          {instrumentsQuery.isLoading && <Skeleton className="h-8 w-full" />}
          {instrumentsQuery.data?.data.map((instrument) => (
            <button
              key={instrument.id}
              type="button"
              className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
              onClick={() => {
                addToWatchlist(watchlistId, instrument.id);
                setOpen(false);
              }}
            >
              <span className="font-medium">{instrument.symbol}</span>
              <span className="text-xs text-muted-foreground">{instrument.name}</span>
            </button>
          ))}
          {instrumentsQuery.data?.data.length === 0 && <p className="p-2 text-sm text-muted-foreground">No matches.</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function WatchlistsPage() {
  const watchlists = useWatchlistStore((s) => s.watchlists);
  const activeWatchlistId = useWatchlistStore((s) => s.activeWatchlistId);
  const setActiveWatchlist = useWatchlistStore((s) => s.setActiveWatchlist);
  const renameWatchlist = useWatchlistStore((s) => s.renameWatchlist);
  const deleteWatchlist = useWatchlistStore((s) => s.deleteWatchlist);
  const removeFromWatchlist = useWatchlistStore((s) => s.removeFromWatchlist);
  const reorderWatchlist = useWatchlistStore((s) => s.reorderWatchlist);
  const favorites = useWatchlistStore((s) => s.favoriteInstrumentIds);
  const toggleFavorite = useWatchlistStore((s) => s.toggleFavorite);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const active = watchlists.find((w) => w.id === activeWatchlistId) ?? watchlists[0];

  // Instruments aren't individually fetchable in bulk by id in one call
  // (the market-data module has no "get many by id" endpoint), so this
  // page pages through instruments client-side matched against the
  // watchlist's stored ids — fine at the scale a personal watchlist
  // actually reaches, and avoids an N+1 request per row.
  const instrumentsQuery = useInstruments({ pageSize: 500 });
  const watchlistInstruments = useMemo(() => {
    if (!active) return [];
    const byId = new Map((instrumentsQuery.data?.data ?? []).map((i) => [i.id, i]));
    return active.instrumentIds.map((id) => byId.get(id)).filter((i): i is NonNullable<typeof i> => !!i);
  }, [active, instrumentsQuery.data]);

  const quotesQuery = useQuotes(watchlistInstruments.map((i) => i.id));

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || !active || dragIndex === targetIndex) return;
    const next = [...active.instrumentIds];
    const [moved] = next.splice(dragIndex, 1);
    if (moved === undefined) return;
    next.splice(targetIndex, 0, moved);
    reorderWatchlist(active.id, next);
    setDragIndex(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Watchlists</h1>
          <p className="text-sm text-muted-foreground">
            Saved on this device.{" "}
            <span className="text-xs">(No cross-device sync yet — see this page&apos;s own notes.)</span>
          </p>
        </div>
        <CreateWatchlistDialog />
      </div>

      <Tabs value={active?.id ?? ""} onValueChange={setActiveWatchlist}>
        <TabsList>
          {watchlists.map((w) => (
            <TabsTrigger key={w.id} value={w.id}>
              {w.name}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {active && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            {renamingId === active.id ? (
              <div className="flex items-center gap-2">
                <Input
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  className="h-8 w-48"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && renameDraft.trim()) {
                      renameWatchlist(active.id, renameDraft.trim());
                      setRenamingId(null);
                    }
                  }}
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (renameDraft.trim()) renameWatchlist(active.id, renameDraft.trim());
                    setRenamingId(null);
                  }}
                >
                  Save
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium">{active.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => {
                    setRenamingId(active.id);
                    setRenameDraft(active.name);
                  }}
                  aria-label="Rename watchlist"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteWatchlist(active.id)} aria-label="Delete watchlist">
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            )}
            <AddSymbolDialog watchlistId={active.id} />
          </div>

          {watchlistInstruments.length === 0 ? (
            <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
              No symbols yet. Use &quot;Add symbol&quot; to get started.
            </p>
          ) : (
            <ul className="divide-y rounded-md border">
              {watchlistInstruments.map((instrument, index) => {
                const quote = quotesQuery.data?.find((q) => q.instrumentId === instrument.id);
                const isFavorite = favorites.includes(instrument.id);
                return (
                  <li
                    key={instrument.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" aria-hidden="true" />
                      <button type="button" onClick={() => toggleFavorite(instrument.id)} aria-label={isFavorite ? "Unfavorite" : "Favorite"}>
                        <Star className={`h-3.5 w-3.5 ${isFavorite ? "fill-warning text-warning" : "text-muted-foreground"}`} aria-hidden="true" />
                      </button>
                      <Link href={`/market/${instrument.id}`} className="font-medium hover:underline">
                        {instrument.symbol}
                      </Link>
                      <span className="text-xs text-muted-foreground">{instrument.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="tabular-nums text-sm">{toNumber(quote?.lastPrice)?.toFixed(5) ?? "—"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromWatchlist(active.id, instrument.id)}
                        aria-label={`Remove ${instrument.symbol}`}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
