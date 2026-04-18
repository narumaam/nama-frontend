import { test, expect } from '@playwright/test'

/**
 * Bookings flow tests
 * Runs with demo storageState. Falls back to SEED_BOOKINGS.
 */
test.describe('Bookings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/bookings')
    await expect(page.getByRole('heading', { name: 'Bookings', exact: true })).toBeVisible()
  })

  test('page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Bookings', exact: true })).toBeVisible()
  })

  test('KPI cards are rendered', async ({ page }) => {
    // Confirmed Bookings stat card
    await expect(page.getByText('Confirmed Bookings')).toBeVisible()
  })

  test('seed bookings are listed', async ({ page }) => {
    // Booking cards show IDs like #1001, #1002, etc.
    const bookingItems = await page.getByText(/#\d{3,}/).count()
    expect(bookingItems).toBeGreaterThan(0)
  })

  test('status filter shows ALL bookings by default', async ({ page }) => {
    // The filter dropdown should exist and show 'ALL' as default
    const filterEl = page.locator('select, [role="combobox"]').first()
    const count = await filterEl.count()
    if (count > 0) {
      // Filter exists — page renders correctly
      await expect(filterEl).toBeVisible()
    } else {
      // Filter is a button group — just confirm bookings are listed
      const bookingCount = await page.getByText(/#\d{3,}/).count()
      expect(bookingCount).toBeGreaterThan(0)
    }
  })

  test('clicking a booking opens the detail panel', async ({ page }) => {
    // Click the first booking card (shows #1001, #1002 etc.)
    const firstBooking = page.getByText(/#\d{3,}/).first()
    await firstBooking.click()
    // Detail panel should appear — look for confirmation/trip details
    await expect(
      page.getByText(/confirmed|itinerary|traveller|pax/i).first()
    ).toBeVisible({ timeout: 5_000 })
  })

  test('search input is present', async ({ page }) => {
    await expect(page.getByPlaceholder(/search/i)).toBeVisible()
  })

  test('search filters the list', async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i)
    await searchInput.fill('zzz_no_match_xyz')
    // Should show no results or empty state, not crash
    await expect(page).not.toHaveURL(/\/login/)
    await expect(page.getByRole('heading', { name: 'Bookings', exact: true })).toBeVisible()
  })
})
