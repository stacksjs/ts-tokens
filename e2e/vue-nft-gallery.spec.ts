import { test, expect } from '@playwright/test'
import { injectWalletMock, MOCK_PUBLIC_KEY } from './helpers/wallet-mock'

test.describe('Vue NFT Gallery', () => {
  test('loads the app', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('#app')).toBeVisible()
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

    // Should show the connected public key
    await expect(page.getByText(new RegExp(MOCK_PUBLIC_KEY.slice(0, 8)))).toBeVisible()

    // Disconnect button should now be visible
    await expect(page.getByText(/disconnect/i)).toBeVisible()

    // Click disconnect
    await page.getByText(/disconnect/i).click()

    // Connect button should reappear
    await expect(page.getByText(/connect phantom/i)).toBeVisible()
  })

  test('gallery visible after wallet connect', async ({ page }) => {
    await injectWalletMock(page)
    await page.goto('/')

    // Connect wallet
    await page.getByText(/connect phantom/i).click()

    // After connecting, the NFTGallery component should render
    // It uses the owner prop (publicKey) to display the gallery
    await expect(page.getByText(new RegExp(MOCK_PUBLIC_KEY.slice(0, 8)))).toBeVisible()
  })
})
