"use client";

import Link from "next/link";
import { Bell, CheckCheck, Inbox, KeyRound } from "lucide-react";
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Badge, Skeleton } from "@rmsm/ui";
import { useRequestContext } from "@/hooks/use-request-context";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/features/notifications/hooks/use-notifications";
import type { Notification, NotificationPriority } from "@/features/notifications/types";

const PRIORITY_VARIANT: Record<NotificationPriority, "destructive" | "warning" | "secondary"> = {
  URGENT: "destructive",
  HIGH: "warning",
  NORMAL: "secondary",
  LOW: "secondary",
};

const PREVIEW_COUNT = 6;

function isUnread(n: Notification) {
  return n.readAt === null && n.archivedAt === null;
}

function NotificationPreviewRow({ notification }: { notification: Notification }) {
  const markRead = useMarkNotificationRead();
  return (
    <DropdownMenuItem
      onSelect={(e) => {
        e.preventDefault();
        markRead.mutate(notification.id);
      }}
      className="flex-col items-start gap-0.5 whitespace-normal py-2"
    >
      <div className="flex w-full items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
        <span className="flex-1 truncate text-sm font-medium">{notification.subject ?? notification.channel}</span>
        <Badge variant={PRIORITY_VARIANT[notification.priority]} className="shrink-0">
          {notification.priority}
        </Badge>
      </div>
      <p className="line-clamp-2 pl-3.5 text-xs text-muted-foreground">{notification.body}</p>
    </DropdownMenuItem>
  );
}

/**
 * UD-001.1 Phase 2 — Notification Center (Header).
 *
 * A compact preview reusing the exact hooks and types the full
 * `/notifications` page (`app/(app)/notifications/page.tsx`) already
 * uses — no new API surface. Shows up to `PREVIEW_COUNT` unread
 * notifications; "View all" links to the full page, which keeps its own
 * tabs/search/priority filter/archive/delete untouched. Gated the same
 * way that page's own `SessionGate` gates it (`useRequestContext()`),
 * but without duplicating `SessionBar`'s full connect form inside a
 * header dropdown — it links to the full page instead, where that form
 * already lives.
 */
export function NotificationCenter() {
  const ctx = useRequestContext();
  const notificationsQuery = useNotifications();
  const markAllRead = useMarkAllRead();

  const unread = (notificationsQuery.data?.items ?? []).filter(isUnread);
  const unreadCount = unread.length;
  const preview = unread.slice(0, PREVIEW_COUNT);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}>
          <Bell className="h-4 w-4" aria-hidden="true" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => markAllRead.mutate(unread.map((n) => n.id))}
              disabled={markAllRead.isPending}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              {markAllRead.isPending ? "Marking…" : "Mark all read"}
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {!ctx ? (
          <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
            <KeyRound className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">No session connected</p>
            <p className="text-xs text-muted-foreground">Connect a session on the Notifications page to see updates here.</p>
          </div>
        ) : notificationsQuery.isLoading ? (
          <div className="space-y-2 p-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : preview.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-3 py-6 text-center">
            <Inbox className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </div>
        ) : (
          <div className="max-h-80 overflow-y-auto">
            {preview.map((n) => (
              <NotificationPreviewRow key={n.id} notification={n} />
            ))}
          </div>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-sm font-medium">
            View all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
