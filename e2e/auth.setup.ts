import { test as setup } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const authFile = path.join(__dirname, '.auth/demo.json')

/**
 * Auth setup — visits /demo which sets the nama_demo=1 cookie
 * and redirects to /dashboard. Saves the resulting storageState
 * so all other tests start pre-authenticated.
 */
setup('authenticate via demo mode', async ({ page }) => {
  await page.goto('/demo')
  await page.waitForURL('**/dashboard', { timeout: 15_000 })

  // Ensure the directory exists
  fs.mkdirSync(path.dirname(authFile), { recursive: true })
  await page.context().storageState({ path: authFile })
})
