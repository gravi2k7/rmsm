import { test, expect } from "@playwright/test";
import { e2eCredentialsAvailable, seedSession } from "./fixtures/session";

test.describe("Rule Builder", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentialsAvailable(), "Requires a live backend + seeded E2E_ORGANIZATION_ID/E2E_ACCESS_TOKEN, plus an existing strategy id.");
    await seedSession(page);
  });

  // Assumes E2E_STRATEGY_ID names a strategy already created by the CRUD suite
  // or seeded independently — the new-version route is nested under a real
  // strategy id, so this test can't create one from a blank slate on its own.
  const strategyId = process.env.E2E_STRATEGY_ID ?? "";

  test("adds a rule and a nested group to the entry-rules tree", async ({ page }) => {
    test.skip(!strategyId, "Requires E2E_STRATEGY_ID.");
    await page.goto(`/strategies/${strategyId}/versions/new`);

    const entrySection = page.getByRole("heading", { name: "Entry Rules" }).locator("..");
    await entrySection.getByRole("button", { name: "Rule" }).click();
    await expect(page.getByPlaceholder("Rule label").first()).toBeVisible();

    await entrySection.getByRole("button", { name: "Group" }).click();
    await expect(page.getByText("No conditions yet")).toBeVisible(); // the new nested group starts empty
  });

  test("fills in a full rule condition end to end", async ({ page }) => {
    test.skip(!strategyId, "Requires E2E_STRATEGY_ID.");
    await page.goto(`/strategies/${strategyId}/versions/new`);

    await page.getByRole("button", { name: "Rule" }).first().click();
    await page.getByPlaceholder("Rule label").first().fill("Close crosses above EMA 20");

    await page.getByLabel("Comparison operator").click();
    await page.getByRole("option", { name: "crosses above" }).click();

    const fieldsets = page.locator("fieldset");
    await fieldsets.nth(0).getByLabel("Type").click();
    await page.getByRole("option", { name: "Market field" }).click();
    await fieldsets.nth(0).getByLabel("Field").click();
    await page.getByRole("option", { name: "close" }).click();

    await fieldsets.nth(1).getByLabel("Type").click();
    await page.getByRole("option", { name: "Indicator" }).click();
    await fieldsets.nth(1).getByLabel("Indicator identifier").fill("ema");
    await fieldsets.nth(1).getByLabel("Output series").fill("value");

    await expect(page.getByPlaceholder("Rule label").first()).toHaveValue("Close crosses above EMA 20");
  });

  test("duplicates a rule, producing a second identical row", async ({ page }) => {
    test.skip(!strategyId, "Requires E2E_STRATEGY_ID.");
    await page.goto(`/strategies/${strategyId}/versions/new`);

    await page.getByRole("button", { name: "Rule" }).first().click();
    await page.getByPlaceholder("Rule label").first().fill("Original rule");
    await page.getByRole("button", { name: /Duplicate rule/i }).first().click();

    const labelInputs = page.locator('input[placeholder="Rule label"]');
    await expect(labelInputs).toHaveCount(2);
    await expect(labelInputs.nth(0)).toHaveValue("Original rule");
    await expect(labelInputs.nth(1)).toHaveValue("Original rule");
  });

  test("deletes a rule and returns to the empty state", async ({ page }) => {
    test.skip(!strategyId, "Requires E2E_STRATEGY_ID.");
    await page.goto(`/strategies/${strategyId}/versions/new`);

    await page.getByRole("button", { name: "Rule" }).first().click();
    await expect(page.getByPlaceholder("Rule label").first()).toBeVisible();

    await page.getByRole("button", { name: /Delete rule/i }).first().click();
    await expect(page.getByText("No conditions yet").first()).toBeVisible();
  });

  test("blocks saving a draft with no entry rules", async ({ page }) => {
    test.skip(!strategyId, "Requires E2E_STRATEGY_ID.");
    await page.goto(`/strategies/${strategyId}/versions/new`);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText(/Entry rules must have at least one condition/i)).toBeVisible();
  });
});
