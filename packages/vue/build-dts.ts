/**
 * Declaration-file build for vue-tokens.
 *
 * The JS build is handled by Vite (see vite.config.ts). This script emits the
 * TypeScript declarations:
 *
 * 1. TS modules (composables, plugin, types, utils) go through `bun build`
 *    with bun-plugin-dtsx — the same generator the core package uses — into a
 *    temp dir, then only the `.d.ts` files are copied into `dist/` so they
 *    never clobber Vite's JS output.
 * 2. `.vue` SFCs have no TS-visible source of truth for dtsx, so
 *    `dist/components/index.d.ts` is generated as pragmatic `DefineComponent`
 *    declarations (prop-level typings are intentionally not emitted).
 * 3. `dist/index.d.ts` is written to mirror `src/index.ts`.
 */

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dts } from 'bun-plugin-dtsx'

const EXTERNALS = ['vue', 'ts-tokens', 'ts-governance', '@solana/web3.js', '@solana/spl-token']
const TMP = './.dts-tmp'

async function main(): Promise<void> {
  // --- 1. Declarations for the TS modules -------------------------------------

  const result = await Bun.build({
    target: 'browser',
    entrypoints: [
      './src/composables/index.ts',
      './src/types.ts',
      './src/plugin.ts',
      './src/utils/format.ts',
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
  for (const glob of [new Bun.Glob('**/*.d.ts')]) {
    for await (const file of glob.scan({ cwd: TMP })) {
      const target = `./dist/${file}`
      await mkdir(target.slice(0, target.lastIndexOf('/')), { recursive: true })
      await cp(`${TMP}/${file}`, target)
    }
  }
  await rm(TMP, { recursive: true, force: true })

  // --- 2. Pragmatic SFC declarations ------------------------------------------

  // Parse `export { default as X } from './X.vue'` lines from the barrel.
  const barrel = await readFile('./src/components/index.ts', 'utf8')
  const names = [...barrel.matchAll(/export \{ default as (\w+) \} from '\.\/(\w+)\.vue'/g)]
    .map(([, name]) => name)

  const componentsDts = `/**
 * Vue component declarations.
 *
 * The .vue single-file components are compiled by Vite at build time. Their
 * declarations are emitted as pragmatic DefineComponent typings — prop-level
 * types are intentionally not declared (see build-dts.ts).
 */
import type { DefineComponent } from 'vue'

${names.map(name => `export declare const ${name}: DefineComponent<object, object, unknown>`).join('\n')}
`
  await mkdir('./dist/components', { recursive: true })
  await writeFile('./dist/components/index.d.ts', componentsDts)

  // --- 3. Package entry declarations -------------------------------------------

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

  console.log(`Declarations emitted (${names.length} components declared).`)
}

main()
