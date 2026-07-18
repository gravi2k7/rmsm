import type { Page } from "@playwright/test";

/**
 * E2E tests need a real organization id + access token issued by the
 * platform's own Module 002 auth flow against a live backend + database —
 * neither of which exists in this sandbox (no Postgres, no running API,
 * no network path to spin one up). These tests are real and will run
 * against any environment where `E2E_ORGANIZATION_ID` / `E2E_ACCESS_TOKEN`
 * are set (a seeded test org + a token from that org's own login), e.g. CI
 * or a developer's local stack. Without them, every test in this file
 * skips itself via `test.skip()` rather than failing on a missing fixture
 * or silently asserting nothing.
 */
export function e2eCredentialsAvailable(): boolean {
  return !!process.env.E2E_ORGANIZATION_ID && !!process.env.E2E_ACCESS_TOKEN;
}

/** Seeds the zustand-persisted session store directly via localStorage,
 * matching `useSessionStore`'s own persist key (`rmsm-session`) and
 * zustand's own persist serialization format — the same effect as a user
 * pasting these values into the Session Bar, without driving that UI. */
export async function seedSession(page: Page): Promise<void> {
  const organizationId = process.env.E2E_ORGANIZATION_ID ?? "";
  const accessToken = process.env.E2E_ACCESS_TOKEN ?? "";

  await page.addInitScript(
    ({ organizationId, accessToken }) => {
      window.localStorage.setItem(
        "rmsm-session",
        JSON.stringify({ state: { organizationId, accessToken }, version: 0 }),
      );
    },
    { organizationId, accessToken },
  );
}
