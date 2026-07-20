"use client";

import { useMemo, useState } from "react";
import { Search, CheckCheck, Archive, Trash2, Inbox } from "lucide-react";
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Badge, Skeleton, Button, Tabs, TabsList, TabsTrigger, Alert, AlertDescription } from "@rmsm/ui";
import { SessionGate } from "@/components/ui-extra/session-gate";
import { EmptyState } from "@/components/ui-extra/empty-state";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useNotifications, useMarkNotificationRead, useArchiveNotification, useDeleteNotification, useMarkAllRead } from "@/features/notifications/hooks/use-notifications";
import type { Notification, NotificationPriority } from "@/features/notifications/types";

type Tab = "unread" | "read" | "archived";
const PRIORITY_VARIANT: Record<NotificationPriority, "destructive" | "warning" | "secondary"> = {
  URGENT: "destructive",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "secondary",
};

function isUnread(n: Notification) {
  return n.readAt === null && n.archivedAt === null;
}

function NotificationRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  const archiveMutation = useArchiveNotification();
  const deleteMutation = useDeleteNotification();

  return (
    <li className={`flex items-start justify-between gap-4 border-b px-3 py-3 last:border-0 ${isUnread(notification) ? "bg-accent/40" : ""}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isUnread(notification) && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
          <span className="font-medium">{notification.subject ?? notification.channel}</span>
          <Badge variant={PRIORITY_VARIANT[notification.priority]}>{notification.priority}</Badge>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
        <p className="mt-1 text-xs text-muted-foreground">{new Date(notification.createdAt).toLocaleString()}</p>
      </div>
      <div className="flex shrink-0 gap-1">
        {isUnread(notification) && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => markRead.mutate(notification.id)} aria-label="Mark read">
            <CheckCheck className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        {!notification.archivedAt && (
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => archiveMutation.mutate(notification.id)} aria-label="Archive">
            <Archive className="h-4 w-4" aria-hidden="true" />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(notification.id)} aria-label="Delete">
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function NotificationCenterContent() {
  const notificationsQuery = useNotifications();
  const markAllRead = useMarkAllRead();
  const [tab, setTab] = useState<Tab>("unread");
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState<NotificationPriority | "ALL">("ALL");
  const debouncedSearch = useDebouncedValue(search, 300);

  const all = useMemo(() => notificationsQuery.data?.items ?? [], [notificationsQuery.data]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return all.filter((n) => {
      if (tab === "unread" && !isUnread(n)) return false;
      if (tab === "read" && (n.readAt === null || n.archivedAt !== null)) return false;
      if (tab === "archived" && n.archivedAt === null) return false;
      if (priority !== "ALL" && n.priority !== priority) return false;
      if (q && !(n.subject ?? "").toLowerCase().includes(q) && !n.body.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [all, tab, priority, debouncedSearch]);

  const unreadIds = all.filter(isUnread).map((n) => n.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadIds.length} unread</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => markAllRead.mutate(unreadIds)} disabled={unreadIds.length === 0 || markAllRead.isPending}>
          <CheckCheck className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {markAllRead.isPending ? "Marking…" : "Mark all read"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="unread">Unread</TabsTrigger>
            <TabsTrigger value="read">Read</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          <Select value={priority} onValueChange={(v: NotificationPriority | "ALL") => setPriority(v)}>
            <SelectTrigger className="w-36" aria-label="Filter by priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Any priority</SelectItem>
              <SelectItem value="URGENT">Urgent</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notifications…" className="w-56 pl-8" aria-label="Search notifications" />
          </div>
        </div>
      </div>

      {notificationsQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>Couldn&apos;t load notifications. Please try again.</AlertDescription>
        </Alert>
      )}

      {notificationsQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Inbox className="h-8 w-8" />} title="Nothing here" description="No notifications match this view." />
      ) : (
        <ul className="rounded-md border">
          {filtered.map((n) => (
            <NotificationRow key={n.id} notification={n} />
          ))}
        </ul>
      )}
    </div>
  );
}

export default function NotificationCenterPage() {
  return (
    <SessionGate>
      <NotificationCenterContent />
    </SessionGate>
  );
}
