import { test, expect } from "@playwright/test";

test("homepage loads and shows the app name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("RMSM AI")).toBeVisible();
});

test("health API route responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.status).toBe("ok");
});
