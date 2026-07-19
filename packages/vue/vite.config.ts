import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

// Library-mode build for vue-tokens. `bun build` cannot compile .vue SFCs (it
// emitted them as raw string assets), so the package is built with Vite +
// @vitejs/plugin-vue instead. Framework and Solana deps stay external — they
// are peer dependencies of the published package.
export default defineConfig({
  plugins: [vue()],
  build: {
    sourcemap: true,
    lib: {
      entry: {
        'index': 'src/index.ts',
        'components/index': 'src/components/index.ts',
        'composables/index': 'src/composables/index.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [/^vue$/, /^ts-tokens(\/.*)?$/, /^ts-governance(\/.*)?$/, /^@solana\//],
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
    },
  },
})
