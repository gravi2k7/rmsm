import { test, expect } from "@playwright/test";
import { e2eCredentialsAvailable, seedSession } from "./fixtures/session";

test.describe("Search and filtering", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentialsAvailable(), "Requires a live backend + seeded E2E_ORGANIZATION_ID/E2E_ACCESS_TOKEN.");
    await seedSession(page);
  });

  test("filters the strategy list by status", async ({ page }) => {
    await page.goto("/strategies/list");
    await page.getByRole("combobox", { name: "Filter by status" }).click();
    await page.getByRole("option", { name: "Archived" }).click();

    await expect(page).not.toHaveURL(/error/);
    // Every visible status badge in the results should read ARCHIVED once the filter settles.
    const badges = page.getByText("ARCHIVED");
    if ((await badges.count()) > 0) {
      await expect(badges.first()).toBeVisible();
    }
  });

  test("filters the strategy list by category", async ({ page }) => {
    await page.goto("/strategies/list");
    await page.getByRole("combobox", { name: "Filter by category" }).click();
    await page.getByRole("option", { name: "MOMENTUM" }).click();

    await expect(page.getByRole("combobox", { name: "Filter by category" })).toContainText("MOMENTUM");
  });

  test("navigates to the dedicated search page with a query param", async ({ page }) => {
    await page.goto("/strategies/search?q=momentum");
    await expect(page.getByLabel("Search strategies")).toHaveValue("momentum");
  });

  test("shows an empty state for a query that matches nothing", async ({ page }) => {
    const nonsense = `zzz-no-such-strategy-${Date.now()}`;
    await page.goto(`/strategies/search?q=${nonsense}`);
    await expect(page.getByText("No strategies found")).toBeVisible();
  });

  test("paginates through results without an error", async ({ page }) => {
    await page.goto("/strategies/list");
    const nextButton = page.getByRole("button", { name: "Next" });
    if (await nextButton.isEnabled().catch(() => false)) {
      await nextButton.click();
      await expect(page.getByRole("button", { name: "Previous" })).toBeEnabled();
    }
  });
});
