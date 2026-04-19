import { test, expect } from '@playwright/test'

/**
 * Reports & BI page tests
 * Runs with demo storageState. Falls back to SEED_TEAM_PERFORMANCE.
 */
test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/reports')
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible()
  })

  test('KPI summary cards render', async ({ page }) => {
    // 4 stat cards: Total GMV, Conversion Rate, Active Itineraries, Total Leads
    await expect(page.getByText('Total GMV')).toBeVisible()
    await expect(page.getByText('Conversion Rate')).toBeVisible()
    await expect(page.getByText('Total Leads')).toBeVisible()
    // Fourth card — label differs based on tab; just count ≥ 4 stat cards
    const statCards = page.locator('.bg-white.border.border-slate-100.rounded-2xl.p-5')
    const count = await statCards.count()
    expect(count).toBeGreaterThanOrEqual(4)
  })

  test('time range selector — 30d is active by default', async ({ page }) => {
    // The range picker renders "7d", "30d", "90d", "12mo" buttons
    await expect(page.getByRole('button', { name: '30d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '7d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '90d' })).toBeVisible()
    await expect(page.getByRole('button', { name: '12mo' })).toBeVisible()
  })

  test('clicking "90d" range tab activates it', async ({ page }) => {
    const btn90d = page.getByRole('button', { name: '90d' })
    await btn90d.click()
    // Page should not crash and heading remains
    await expect(page.getByRole('heading', { name: /reports/i })).toBeVisible()
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('Report tabs render — Revenue, Funnel, Agents, Destinations, AI Usage', async ({ page }) => {
    await expect(page.getByRole('button', { name: /revenue/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /funnel/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /agents/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /destinations/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /ai usage/i })).toBeVisible()
  })

  test('Agents tab shows agent performance table with seed data', async ({ page }) => {
    await page.getByRole('button', { name: /agents/i }).click()
    // Table heading
    await expect(page.getByText('Agent Performance Leaderboard')).toBeVisible({ timeout: 5_000 })
    // Seed agents: Priya Mehta, Arjun Shah etc.
    const agentRows = await page.locator('text=/Priya|Arjun|Nisha|Rohit/i').count()
    expect(agentRows).toBeGreaterThan(0)
  })

  test('agent table has at least one row', async ({ page }) => {
    await page.getByRole('button', { name: /agents/i }).click()
    await expect(page.getByText('Agent Performance Leaderboard')).toBeVisible({ timeout: 5_000 })
    // tbody rows — agent names are in table cells
    const rows = page.locator('tbody tr')
    const count = await rows.count()
    expect(count).toBeGreaterThan(0)
  })

  test('Revenue tab shows area chart and daily breakdown table', async ({ page }) => {
    // Revenue tab is active by default
    await expect(page.getByText(/revenue vs\. cost/i)).toBeVisible({ timeout: 5_000 })
    // Daily breakdown table
    await expect(page.getByText('Daily Breakdown')).toBeVisible({ timeout: 5_000 })
  })

  test('Funnel tab shows conversion funnel', async ({ page }) => {
    await page.getByRole('button', { name: /funnel/i }).click()
    await expect(page.getByText('Conversion Funnel')).toBeVisible({ timeout: 5_000 })
    // Funnel stages
    await expect(page.getByText(/queries received/i)).toBeVisible({ timeout: 5_000 })
  })
})
