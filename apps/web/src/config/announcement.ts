/**
 * Announcement bar config (Task 5) — flip `enabled` off or edit the message
 * for a new campaign without touching `AnnouncementBar`'s code. `dismissKey`
 * versions the persisted dismissal: bump it when the message changes so a
 * previously-dismissed banner reappears for a new campaign.
 */
export const announcementConfig = {
  enabled: true,
  message: "RMSM is in early access — reach out for a guided walkthrough.",
  link: { label: "Contact us", href: "/contact" },
  dismissible: true,
  dismissKey: "rmsm-announcement-2026-07",
} as const;
