import { defineConfig } from '@playwright/test'

// Each example app is served on its own port with its own webServer so the two
// suites don't collide on a single manually-started dev server (the previous
// config pointed both projects at localhost:5173, so whichever app happened to
// be running answered — and mis-answered — both suites).
const REACT_PORT = 5174
const VUE_PORT = 5175

export default defineConfig({
  testDir: '.',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
  },
  webServer: [
    {
      command: `bun run dev -- --port ${REACT_PORT} --strictPort`,
      cwd: '../examples/nft-minting-site',
      port: REACT_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: `bun run dev -- --port ${VUE_PORT} --strictPort`,
      cwd: '../examples/vue-nft-gallery',
      port: VUE_PORT,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: 'react-nft-minting',
      testMatch: 'react-nft-minting.spec.ts',
      use: { baseURL: `http://localhost:${REACT_PORT}` },
    },
    {
      name: 'vue-nft-gallery',
      testMatch: 'vue-nft-gallery.spec.ts',
      use: { baseURL: `http://localhost:${VUE_PORT}` },
    },
  ],
})
