import { test, expect } from '@playwright/test';

test.describe('Creator Lens SaaS Navigation E2E', () => {

  test('sidebar is visible and nav links work correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/');

    // Sidebar should be present on desktop
    await expect(page.locator('aside')).toBeVisible();

    // ── Dashboard ──────────────────────────────────────────────────────────
    await page.click('text=Dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    // No session loaded initially
    await expect(page.locator('text=No Active Analysis')).toBeVisible();

    // ── Sessions (was "Session History") ───────────────────────────────────
    await page.click('text=Sessions');
    await expect(page).toHaveURL(/\/history/);

    // ── Saved Chats ────────────────────────────────────────────────────────
    await page.click('text=Saved Chats');
    await expect(page).toHaveURL(/\/saved-chats/);
    await expect(page.locator('text=Saved Chats').first()).toBeVisible();

    // ── New Analysis ───────────────────────────────────────────────────────
    await page.click('text=New Analysis');
    await expect(page).toHaveURL(/\/analysis\/new/);
  });

  test('TopBar shows correct breadcrumb on each page', async ({ page }) => {
    // Dashboard breadcrumb
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.locator('header')).toContainText('Creator Lens');
    await expect(page.locator('header')).toContainText('Dashboard');

    // Sessions breadcrumb
    await page.goto('http://localhost:3000/history');
    await expect(page.locator('header')).toContainText('Sessions');

    // New Analysis breadcrumb
    await page.goto('http://localhost:3000/analysis/new');
    await expect(page.locator('header')).toContainText('New Analysis');
  });

  test('sidebar collapses and expands via toggle button', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    const sidebar = page.locator('aside');

    // Sidebar starts expanded (240px)
    await expect(sidebar).toBeVisible();

    // Click collapse toggle (ChevronLeft button at bottom of sidebar)
    const toggleBtn = sidebar.locator('button').last();
    await toggleBtn.click();

    // After collapse the label "Creator Lens" text should be hidden (w-0 / opacity-0)
    // Sidebar itself still visible at 64px
    await expect(sidebar).toBeVisible();

    // Expand again
    await toggleBtn.click();
    await expect(page.locator('text=Creator Lens').first()).toBeVisible();
  });
});
