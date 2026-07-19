import { chmod, cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { dts } from 'bun-plugin-dtsx'

let failed = false

function check(name: string, result: Awaited<ReturnType<typeof Bun.build>>): void {
  if (!result.success) {
    failed = true
    console.error(`Failed to build ${name}:`, result.logs)
  }
}

// Subpath module entrypoints (directories with index.ts)
const submodules = [
  'token',
  'nft',
  'types',
  'utils',
  'drivers',
  'storage',
  'programs',
  'security',
  'staking',
  'batch',
  'multisig',
  'governance',
  'defi',
  'marketplace',
  'indexer',
  'wallets',
  'analytics',
  'fluent',
  'simple-nft',
  'pnft',
  'events',
  'treasury',
  'voting',
  'i18n',
  'debug',
  'testing',
  'actions',
  'automation',
  'compat',
  'compressed-token',
  'core',
  'distribution',
  'fanout',
  'legacy',
  'transaction',
  'vesting',
]

// Single-file module entrypoints
const singleFileModules = [
  'config',
]

async function main(): Promise<void> {
  // Main library entrypoint (JS only — declarations are emitted in a single
  // dedicated pass further below).
  const resp = await Bun.build({
    target: 'bun',
    entrypoints: ['./src/index.ts'],
    outdir: './dist',
    sourcemap: 'external',
  })

  check('index', resp)

  for (const mod of submodules) {
    const result = await Bun.build({
      target: 'bun',
      entrypoints: [`./src/${mod}/index.ts`],
      outdir: `./dist/${mod}`,
      sourcemap: 'external',
    })

    check(mod, result)
  }

  for (const mod of singleFileModules) {
    const result = await Bun.build({
      target: 'bun',
      entrypoints: [`./src/${mod}.ts`],
      outdir: `./dist/${mod}`,
      sourcemap: 'external',
    })

    check(mod, result)
  }

  // CLI entrypoint
  const resp2 = await Bun.build({
    target: 'bun',
    entrypoints: ['./bin/cli.ts'],
    outdir: './dist',
    sourcemap: 'external',
  })

  check('cli', resp2)

  // Make the CLI executable: the published `bin` entry needs a shebang and
  // executable permissions or npm cannot run `tokens` after a global install
  // (publint/pickier flag this as `bin-file-not-executable`). The bundle is
  // built with `target: 'bun'` and is not Node-safe: it keeps named CJS
  // imports (e.g. `import { WebSocketServer } from "ws"`) that Node ESM
  // rejects, so the shebang must be `bun`, not `node`.
  if (resp2.success) {
    const cliPath = './dist/cli.js'
    const contents = await readFile(cliPath, 'utf8')
    if (!contents.startsWith('#!')) {
      await writeFile(cliPath, `#!/usr/bin/env bun\n${contents}`)
    }
    await chmod(cliPath, 0o755)
  }

  // Type declarations ---------------------------------------------------------
  //
  // bun-plugin-dtsx only emits declarations reliably within a *single*
  // Bun.build call — across the many sequential builds above it emits nothing
  // at all. So all library entrypoints are rebuilt once into a temp dir purely
  // for their declarations, which are then mirrored into dist/ so that every
  // subpath in the package exports map (dist/<mod>/index.d.ts) exists.
  const dtsTmp = './.dts-tmp'
  const dtsResult = await Bun.build({
    target: 'bun',
    entrypoints: [
      './src/index.ts',
      ...submodules.map(mod => `./src/${mod}/index.ts`),
      ...singleFileModules.map(mod => `./src/${mod}.ts`),
    ],
    outdir: dtsTmp,
    plugins: [dts()],
  })

  check('dts', dtsResult)

  if (dtsResult.success) {
    for await (const file of new Bun.Glob('**/*.d.ts').scan({ cwd: dtsTmp })) {
      // `src/config.ts` emits `config.d.ts` at the temp root, but the
      // "./config" subpath maps types to ./dist/config/config.d.ts.
      const target = file === 'config.d.ts' ? 'config/config.d.ts' : file
      const dest = `./dist/${target}`
      await mkdir(dirname(dest), { recursive: true })
      await cp(`${dtsTmp}/${file}`, dest)
    }
    await rm(dtsTmp, { recursive: true, force: true })
  }

  if (failed) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
