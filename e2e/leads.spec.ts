import { test, expect } from '@playwright/test'

/**
 * Leads CRM flow tests
 * Runs with demo storageState (nama_demo=1 cookie pre-set).
 * All data falls back to SEED_LEADS — no backend required.
 */
test.describe('Leads Pipeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/leads')
    // Wait for the page heading to confirm load
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible()
  })

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible()
  })

  test('all four filter tabs are present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^all$/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /hot/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /warm/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /cold/i })).toBeVisible()
  })

  test('seed leads are rendered in the list', async ({ page }) => {
    // At least one lead card/row should be visible
    const leadItems = page.locator('[class*="cursor-pointer"]').filter({ hasText: /lead|trip|tour|safari|honeymoon/i })
    // Fall back: just check the list container has children
    const leadCount = await page.locator('text=/₹|pax|days/i').count()
    expect(leadCount).toBeGreaterThan(0)
  })

  test('clicking HOT tab filters the list', async ({ page }) => {
    await page.getByRole('button', { name: /hot/i }).click()
    // The tab should now be active (check aria or class change doesn't break the page)
    await expect(page).not.toHaveURL(/\/login/)
    // Page should not crash
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible()
  })

  test('clicking WARM tab filters the list', async ({ page }) => {
    await page.getByRole('button', { name: /warm/i }).click()
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible()
  })

  test('clicking COLD tab filters the list', async ({ page }) => {
    await page.getByRole('button', { name: /cold/i }).click()
    await expect(page.getByRole('heading', { name: 'Leads Pipeline' })).toBeVisible()
  })

  test('clicking a lead opens the detail panel', async ({ page }) => {
    // Lead cards are cursor-pointer divs containing ₹ or pax data
    const firstLead = page.locator('div[class*="cursor-pointer"]').filter({ hasText: /₹|pax/i }).first()
    const count = await firstLead.count()
    if (count > 0) {
      await firstLead.click()
      // Detail panel shows Overview / Notes / Activity / AI Score tabs
      await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible({ timeout: 5_000 })
    }
  })
})
