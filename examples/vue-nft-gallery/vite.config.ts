import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    nodePolyfills(),
  ],
  resolve: {
    alias: {
      'ts-tokens/wallets': path.resolve(__dirname, '../../packages/ts-tokens/src/wallets/browser.ts'),
      'ts-tokens': path.resolve(__dirname, '../../packages/ts-tokens/src/index.ts'),
    },
  },
})
