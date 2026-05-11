import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("page loads successfully", async ({ page }) => {
    await expect(page).toHaveTitle(/Layout Replicator/i);
  });

  test("URL input field is visible", async ({ page }) => {
    const urlInput = page.getByPlaceholder(/Paste website URL/i);
    await expect(urlInput).toBeVisible();
  });

  test("upload area is visible", async ({ page }) => {
    await expect(page.getByText("Drop your screenshot here")).toBeVisible();
  });

  test("Brand Kit button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Brand Kit/i })).toBeVisible();
  });

  test("AI Model button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /AI Model/i })).toBeVisible();
  });

  test("stack selector buttons are visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /React \+ Tailwind/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /HTML \+ Tailwind/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Next\.js/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Vue 3/i })).toBeVisible();
  });
});
