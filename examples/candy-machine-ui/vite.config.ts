import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      'ts-tokens/wallets': path.resolve(__dirname, '../../packages/ts-tokens/src/wallets/browser.ts'),
      'ts-tokens': path.resolve(__dirname, '../../packages/ts-tokens/src/index.ts'),
    },
  },
})
