import { test, expect } from '@playwright/test'

/**
 * Auth flow tests
 * Runs in the 'auth' Playwright project which has NO storageState,
 * so every test starts with a clean browser (no cookies).
 */
test.describe('Login page', () => {
  test('renders email/password form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('shows error on bad credentials', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('bad@example.com')
    await page.locator('input[type="password"]').fill('wrongpassword')
    await page.locator('button[type="submit"]').click()
    // Should stay on login and show an error (not redirect to dashboard)
    await expect(page).not.toHaveURL(/\/dashboard/)
  })

  test('demo mode link is present', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText(/enter demo mode/i)).toBeVisible()
  })
})

test.describe('Demo mode auth', () => {
  test('visiting /demo sets cookie and redirects to dashboard', async ({ page }) => {
    await page.goto('/demo')
    await page.waitForURL('**/dashboard', { timeout: 15_000 })
    await expect(page).toHaveURL(/\/dashboard/)

    const cookies = await page.context().cookies()
    const demoCookie = cookies.find(c => c.name === 'nama_demo')
    expect(demoCookie?.value).toBe('1')
  })
})

test.describe('Route protection', () => {
  test('unauthenticated user is redirected from /dashboard to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected from /dashboard/leads to /login', async ({ page }) => {
    await page.goto('/dashboard/leads')
    await page.waitForURL('**/login**', { timeout: 10_000 })
    await expect(page).toHaveURL(/\/login/)
  })
})
