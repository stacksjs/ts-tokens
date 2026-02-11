import { test, expect } from '@playwright/test'

test.describe('Vue NFT Gallery', () => {
  test('loads the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#app')).toBeVisible()
  })

  test('shows connect wallet button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/connect/i)).toBeVisible()
  })

  test('shows gallery after wallet connect', async ({ page }) => {
    test.skip(true, 'Requires wallet extension mock')
  })
})
