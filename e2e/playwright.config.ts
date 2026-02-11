import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
  },
  projects: [
    {
      name: 'react-nft-minting',
      testMatch: 'react-nft-minting.spec.ts',
    },
    {
      name: 'vue-nft-gallery',
      testMatch: 'vue-nft-gallery.spec.ts',
    },
  ],
})
