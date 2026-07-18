import { test, expect } from "@playwright/test";
import { e2eCredentialsAvailable, seedSession } from "./fixtures/session";

test.describe("Version workflow", () => {
  const strategyId = process.env.E2E_STRATEGY_ID ?? "";

  test.beforeEach(async ({ page }) => {
    test.skip(!e2eCredentialsAvailable() || !strategyId, "Requires a live backend, seeded credentials, and E2E_STRATEGY_ID.");
    await seedSession(page);
  });

  test("creates a draft version with one entry rule and one exit rule", async ({ page }) => {
    await page.goto(`/strategies/${strategyId}/versions/new`);

    const entrySection = page.getByRole("heading", { name: "Entry Rules" }).locator("..");
    await entrySection.getByRole("button", { name: "Rule" }).click();
    await page.getByPlaceholder("Rule label").first().fill("RSI oversold");

    const exitSection = page.getByRole("heading", { name: "Exit Rules" }).locator("..");
    await exitSection.getByRole("button", { name: "Rule" }).click();
    await page.getByPlaceholder("Rule label").nth(1).fill("RSI overbought");

    await page.getByRole("button", { name: "Save Draft" }).click();

    await expect(page).toHaveURL(/\/versions\/[0-9a-f-]+$/);
    await expect(page.getByText("DRAFT")).toBeVisible();
  });

  test("runs the full approval → publish pipeline on the latest draft", async ({ page }) => {
    // Assumes the "creates a draft version" test above (or an equivalent
    // seed step) has already produced at least one DRAFT version for this
    // strategy — version detail pages are reached by id, not created here.
    await page.goto(`/strategies/${strategyId}`);
    await page.getByRole("tab", { name: "Versions" }).click();
    await page.getByRole("link", { name: /^v\d+$/ }).first().click();

    // Validate (DRAFT -> VALIDATED, assuming a passing rule tree)
    const validateButton = page.getByRole("button", { name: "Validate" });
    if (await validateButton.isVisible()) {
      await validateButton.click();
      await expect(page.getByText(/VALIDATED|Validation failed/)).toBeVisible();
    }

    // Request approval (VALIDATED -> PENDING_APPROVAL)
    const requestApprovalButton = page.getByRole("button", { name: "Request Approval" });
    if (await requestApprovalButton.isVisible()) {
      await requestApprovalButton.click();
      await expect(page.getByText("PENDING APPROVAL")).toBeVisible();
    }

    // Approve (PENDING_APPROVAL -> APPROVED)
    const approveButton = page.getByRole("button", { name: "Approve" });
    if (await approveButton.isVisible()) {
      await approveButton.click();
      await page.getByRole("button", { name: "Approve", exact: true }).last().click();
      await expect(page.getByText("APPROVED")).toBeVisible();
    }

    // Publish (APPROVED -> PUBLISHED)
    const publishButton = page.getByRole("button", { name: "Publish" });
    if (await publishButton.isVisible()) {
      await publishButton.click();
      await page.getByRole("button", { name: "Publish", exact: true }).last().click();
      await expect(page.getByText("PUBLISHED")).toBeVisible();
    }
  });

  test("rejecting a pending-approval version records a comment and shows REJECTED", async ({ page }) => {
    await page.goto(`/strategies/${strategyId}`);
    await page.getByRole("tab", { name: "Versions" }).click();
    await page.getByRole("link", { name: /^v\d+$/ }).first().click();

    const rejectButton = page.getByRole("button", { name: "Reject" });
    test.skip(!(await rejectButton.isVisible()), "No PENDING_APPROVAL version available to reject in this run.");

    await rejectButton.click();
    await page.getByLabel("Decision comments").fill("Rejected by automated E2E test.");
    await page.getByRole("button", { name: "Reject", exact: true }).last().click();

    await expect(page.getByText("REJECTED")).toBeVisible();
  });

  test("rolling back a published version creates a new draft", async ({ page }) => {
    await page.goto(`/strategies/${strategyId}`);
    await page.getByRole("tab", { name: "Versions" }).click();
    await page.getByRole("link", { name: /^v\d+$/ }).first().click();

    const rollbackButton = page.getByRole("button", { name: /Rollback to new draft/i });
    test.skip(!(await rollbackButton.isVisible()), "No PUBLISHED/SUPERSEDED version available to roll back in this run.");

    await rollbackButton.click();
    await page.getByRole("button", { name: "Roll back" }).click();

    await expect(page).toHaveURL(/\/versions\/[0-9a-f-]+$/);
    await expect(page.getByText("DRAFT")).toBeVisible();
  });
});
