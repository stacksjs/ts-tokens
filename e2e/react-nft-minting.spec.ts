import { test, expect } from '@playwright/test'
import { injectWalletMock, MOCK_PUBLIC_KEY } from './helpers/wallet-mock'

test.describe('NFT Minting Site', () => {
  test('loads the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toBeVisible()
  })

  test('shows connect wallet button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText(/connect/i)).toBeVisible()
  })

  test('wallet connection flow', async ({ page }) => {
    await injectWalletMock(page)
    await page.goto('/')

    // Click the connect button
    await page.getByText(/connect phantom/i).click()

    // Should show the connected public key in the status area
    await expect(page.getByText(new RegExp(MOCK_PUBLIC_KEY.slice(0, 8)))).toBeVisible()

    // Disconnect button should now be visible
    await expect(page.getByText(/disconnect/i)).toBeVisible()

    // Click disconnect
    await page.getByText(/disconnect/i).click()

    // Connect button should reappear
    await expect(page.getByText(/connect phantom/i)).toBeVisible()
  })

  test('minting flow', async ({ page }) => {
    await injectWalletMock(page)
    await page.goto('/')

    // Connect wallet first
    await page.getByText(/connect phantom/i).click()
    await expect(page.getByText(/disconnect/i)).toBeVisible()

    // Mint form should be visible after connecting
    await expect(page.getByText(/mint nft/i).first()).toBeVisible()

    // Fill in the mint form
    await page.getByPlaceholder(/nft name/i).fill('Test NFT')
    await page.getByPlaceholder(/metadata uri/i).fill('https://example.com/metadata.json')

    // Submit the mint form (button text is "Mint NFT")
    await page.locator('button', { hasText: /mint nft/i }).click()

    // Should show a status message about minting
    await expect(page.locator('.status')).toBeVisible()
    await expect(page.locator('.status')).toContainText('Test NFT')
  })
})
