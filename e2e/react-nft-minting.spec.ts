import { test, expect } from '@playwright/test'

test.describe('NFT Minting Site', () => {
  test('loads the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('shows connect wallet button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/connect/i)).toBeVisible()
  })

  test('shows mint form after wallet connect', async ({ page }) => {
    // This test would need a wallet mock/extension
    test.skip(true, 'Requires wallet extension mock')
  })
})
