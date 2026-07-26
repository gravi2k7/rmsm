"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { announcementConfig } from "@/config";

/**
 * Dismissible announcement bar (Task 5). Fully config-driven — toggling a
 * campaign on/off, changing the message, or rotating in a new campaign is a
 * `config/announcement.ts` edit, not a component change. Dismissal is
 * persisted to localStorage keyed by `dismissKey`, so bumping that key for a
 * new campaign automatically re-shows the bar to everyone.
 */
export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState(true); // default hidden until we've checked storage, to avoid a flash

  useEffect(() => {
    if (!announcementConfig.enabled) return;
    try {
      const stored = window.localStorage.getItem(announcementConfig.dismissKey);
      setDismissed(stored === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!announcementConfig.enabled || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    try {
      window.localStorage.setItem(announcementConfig.dismissKey, "1");
    } catch {
      // Storage unavailable (e.g. private browsing) — dismissal just won't persist.
    }
  }

  return (
    <div role="region" aria-label="Announcement" className="relative bg-primary text-primary-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-sm sm:px-6 lg:px-8">
        <span>{announcementConfig.message}</span>
        {announcementConfig.link ? (
          <Link href={announcementConfig.link.href} className="font-medium underline underline-offset-2">
            {announcementConfig.link.label}
          </Link>
        ) : null}
      </div>

      {announcementConfig.dismissible ? (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 hover:bg-primary-foreground/10"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
