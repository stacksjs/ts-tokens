/**
 * Declaration-file build for vue-tokens.
 *
 * The JS build is handled by Vite (see vite.config.ts). This script emits the
 * TypeScript declarations:
 *
 * 1. TS modules (composables, plugin, types, utils) AND the .vue components
 *    barrel go through `bun build` with bun-plugin-dtsx (>= 0.11) — which
 *    parses the SFCs and emits real `DefineComponent<Props, …>` typings —
 *    into a temp dir, then only the `.d.ts` files are copied into `dist/` so
 *    they never clobber Vite's JS output.
 * 2. `dist/index.d.ts` is written to mirror `src/index.ts`.
 */

import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { dts } from 'bun-plugin-dtsx'

const EXTERNALS = ['vue', 'ts-tokens', 'ts-governance', '@solana/web3.js', '@solana/spl-token']
const TMP = './.dts-tmp'

async function main(): Promise<void> {
  // --- 1. Declarations for the TS modules and Vue SFCs -------------------------

  const result = await Bun.build({
    target: 'browser',
    entrypoints: [
      './src/composables/index.ts',
      './src/types.ts',
      './src/plugin.ts',
      './src/utils/format.ts',
      './src/components/index.ts',
    ],
    outdir: TMP,
    external: EXTERNALS,
    plugins: [dts()],
  })

  if (!result.success) {
    console.error('Failed to generate declarations:', result.logs)
    process.exit(1)
  }

  // Copy only the declaration files into dist/.
  let count = 0
  for (const glob of [new Bun.Glob('**/*.d.ts')]) {
    for await (const file of glob.scan({ cwd: TMP })) {
      const target = `./dist/${file}`
      await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true })
      await cp(`${TMP}/${file}`, target)
      count++
    }
  }
  await rm(TMP, { recursive: true, force: true })

  // --- 2. Package entry declarations -------------------------------------------

  const indexDts = `/**
 * vue-tokens
 *
 * Vue 3 components and composables for Solana tokens and NFTs.
 *
 * @packageDocumentation
 */

// Composables
export * from './composables/index'

// Components
export * from './components/index'

// Types
export * from './types'

// Utils
export { formatUnits } from './utils/format'

// Plugin
export { TokensPlugin, createTokens, useTokens, TokensKey } from './plugin'
`
  await writeFile('./dist/index.d.ts', indexDts)

  console.log(`Declarations emitted (${count} files).`)
}

main()
