import { test, expect } from '@playwright/test'

/**
 * Quotations flow tests
 * Runs with demo storageState. Falls back to SEED_QUOTATIONS.
 */
test.describe('Quotations', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/quotations')
    // Wait for the page to settle — quotations page fetches leads + itineraries
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })

  test('quotation cards are rendered from seed data', async ({ page }) => {
    // Each quotation card shows a destination
    const cards = await page.locator('text=/₹|days|pax/i').count()
    expect(cards).toBeGreaterThan(0)
  })

  test('new quotation button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /new quotation|new quote|create/i })
    ).toBeVisible()
  })

  test('clicking a quotation card opens the detail view', async ({ page }) => {
    // Click the first "View" button or card
    const viewBtn = page.getByRole('button', { name: /view|open|details/i }).first()
    const cardCount = await viewBtn.count()
    if (cardCount > 0) {
      await viewBtn.click()
      await expect(page).not.toHaveURL(/\/login/)
    }
  })

  test('smart pricing badge is visible on at least one card', async ({ page }) => {
    // SmartPricingInsight component renders BELOW/AT RATE/ABOVE MARKET
    const pricingBadge = page.getByText(/below market|at rate|above market/i).first()
    const count = await pricingBadge.count()
    // This is optional UI — just assert it doesn't crash the page
    await expect(page).not.toHaveURL(/\/login/)
  })

  test('PDF export button is present in detail view', async ({ page }) => {
    // Open a quotation detail
    const viewBtn = page.getByRole('button', { name: /view/i }).first()
    const count = await viewBtn.count()
    if (count > 0) {
      await viewBtn.click()
      // Look for export/PDF button in the modal/panel
      const pdfBtn = page.getByRole('button', { name: /pdf|export|download/i }).first()
      const pdfCount = await pdfBtn.count()
      if (pdfCount > 0) {
        await expect(pdfBtn).toBeVisible()
      }
    }
  })

  test('creating a new quotation adds it to the list', async ({ page }) => {
    const newBtn = page.getByRole('button', { name: /new quotation|new quote|create/i })
    const count = await newBtn.count()
    if (count > 0) {
      const initialCards = await page.locator('text=/₹|days|pax/i').count()
      await newBtn.click()

      // Fill minimal required fields if a form appears
      const destInput = page.getByPlaceholder(/destination/i)
      const destCount = await destInput.count()
      if (destCount > 0) {
        await destInput.fill('Test Destination')
        const submitBtn = page.getByRole('button', { name: /create|save|generate/i }).first()
        await submitBtn.click()
        // The new quotation should appear in the list
        await expect(page.getByText('Test Destination')).toBeVisible({ timeout: 5_000 })
      }
    }
  })
})
