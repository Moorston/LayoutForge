import { test, expect } from "@playwright/test";

test.describe("Model Selector Panel", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("clicking AI Model button opens the panel", async ({ page }) => {
    await page.getByRole("button", { name: /AI Model/i }).click();

    await expect(page.getByText("AI Model Configuration")).toBeVisible();
  });

  test("provider grid is visible when panel is open", async ({ page }) => {
    await page.getByRole("button", { name: /AI Model/i }).click();

    await expect(page.getByText("AI Model Configuration")).toBeVisible();
    await expect(page.getByText("Provider")).toBeVisible();
  });

  test("panel can be closed", async ({ page }) => {
    await page.getByRole("button", { name: /AI Model/i }).click();
    await expect(page.getByText("AI Model Configuration")).toBeVisible();

    // Close by clicking the backdrop
    await page.locator(".fixed.inset-0").first().click();

    await expect(page.getByText("AI Model Configuration")).not.toBeVisible();
  });
});
