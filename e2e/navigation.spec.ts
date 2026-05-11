import { test, expect } from "@playwright/test";

test.describe("Navigation & Interactions", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("URL input accepts text", async ({ page }) => {
    const urlInput = page.getByPlaceholder(/Paste website URL/i);
    await urlInput.fill("https://example.com");

    await expect(urlInput).toHaveValue("https://example.com");
  });

  test("stack selector changes active stack", async ({ page }) => {
    const htmlStack = page.getByRole("button", { name: /HTML \+ Tailwind/i });
    await htmlStack.click();

    // The button should now be in the active state (bg-slate-900)
    await expect(htmlStack).toHaveClass(/bg-slate-900/);
  });

  test("refinement checkbox toggles", async ({ page }) => {
    const checkbox = page.locator('input[type="checkbox"]');
    await expect(checkbox).not.toBeChecked();

    await checkbox.check();
    await expect(checkbox).toBeChecked();

    await checkbox.uncheck();
    await expect(checkbox).not.toBeChecked();
  });

  test("Clone button is disabled when URL is empty", async ({ page }) => {
    const cloneButton = page.getByRole("button", { name: /Clone/i });
    await expect(cloneButton).toBeDisabled();
  });

  test("Clone button enables when URL is entered", async ({ page }) => {
    const urlInput = page.getByPlaceholder(/Paste website URL/i);
    await urlInput.fill("https://example.com");

    const cloneButton = page.getByRole("button", { name: /Clone/i });
    await expect(cloneButton).toBeEnabled();
  });
});
