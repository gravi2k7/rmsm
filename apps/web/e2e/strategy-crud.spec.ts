import { test, expect } from "@playwright/test";
import { e2eCredentialsAvailable, seedSession } from "./fixtures/session";

test.describe("Strategy CRUD workflow", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentialsAvailable(), "Requires a live backend + seeded E2E_ORGANIZATION_ID/E2E_ACCESS_TOKEN — see e2e/fixtures/session.ts");
    await seedSession(page);
  });

  test("creates a new strategy and lands on its details page", async ({ page }) => {
    const uniqueName = `E2E Strategy ${Date.now()}`;

    await page.goto("/strategies/new");
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Description").fill("Created by an automated E2E test.");
    await page.getByRole("combobox", { name: /category/i }).click();
    await page.getByRole("option", { name: "CUSTOM" }).click();
    await page.getByRole("button", { name: "Create Strategy" }).click();

    await expect(page).toHaveURL(/\/strategies\/[0-9a-f-]+$/);
    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();
    await expect(page.getByText("ACTIVE")).toBeVisible();
  });

  test("shows validation errors for an empty create-strategy form", async ({ page }) => {
    await page.goto("/strategies/new");
    await page.getByRole("button", { name: "Create Strategy" }).click();

    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/\/strategies\/new$/);
  });

  test("clones a strategy from the list view", async ({ page }) => {
    await page.goto("/strategies/list");
    const firstRow = page.getByRole("row").nth(1);
    await firstRow.getByRole("button", { name: /Actions for/i }).click();
    await page.getByRole("menuitem", { name: "Clone" }).click();

    await expect(page.getByRole("heading", { name: "Clone strategy" })).toBeVisible();
    const nameInput = page.getByLabel("New strategy name");
    await expect(nameInput).not.toBeEmpty();
    await page.getByRole("button", { name: "Clone" }).click();

    await expect(page).toHaveURL(/\/strategies\/[0-9a-f-]+$/);
  });

  test("archives an active strategy from its details page", async ({ page }) => {
    const uniqueName = `E2E Archive Target ${Date.now()}`;
    await page.goto("/strategies/new");
    await page.getByLabel("Name").fill(uniqueName);
    await page.getByLabel("Description").fill("Will be archived.");
    await page.getByRole("button", { name: "Create Strategy" }).click();
    await expect(page.getByRole("heading", { name: uniqueName })).toBeVisible();

    await page.getByRole("button", { name: "Archive" }).click();
    await page.getByRole("button", { name: "Archive", exact: true }).last().click();

    await expect(page.getByText("ARCHIVED")).toBeVisible();
  });
});
