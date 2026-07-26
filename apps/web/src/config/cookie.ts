/** Cookie consent config (Task 6). No analytics/tracking categories are
 * wired to anything yet — this only defines what the consent UI presents
 * and where the decision is persisted. */
export const cookieConfig = {
  storageKey: "rmsm-cookie-consent",
  message:
    "We use cookies to run this site and, with your consent, to understand how it's used. See our preferences for details.",
  categories: [
    { key: "necessary", label: "Necessary", description: "Required for the site to function. Always on.", required: true },
    { key: "analytics", label: "Analytics", description: "Helps us understand site usage. Not yet implemented.", required: false },
  ],
} as const;
