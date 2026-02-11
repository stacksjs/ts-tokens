import { dts } from 'bun-plugin-dtsx'

// Main library entrypoint
const resp = await Bun.build({
  target: 'bun',
  entrypoints: ['./src/index.ts'],
  outdir: './dist',
  plugins: [dts()],
})

console.log(resp)

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
]

for (const mod of submodules) {
  const result = await Bun.build({
    target: 'bun',
    entrypoints: [`./src/${mod}/index.ts`],
    outdir: `./dist/${mod}`,
    plugins: [dts()],
  })

  if (!result.success) {
    console.error(`Failed to build ${mod}:`, result.logs)
  }
}

// Single-file module entrypoints
const singleFileModules = [
  'config',
]

for (const mod of singleFileModules) {
  const result = await Bun.build({
    target: 'bun',
    entrypoints: [`./src/${mod}.ts`],
    outdir: `./dist/${mod}`,
    plugins: [dts()],
  })

  if (!result.success) {
    console.error(`Failed to build ${mod}:`, result.logs)
  }
}

// CLI entrypoint
const resp2 = await Bun.build({
  target: 'bun',
  entrypoints: ['./bin/cli.ts'],
  outdir: './dist',
  plugins: [dts()],
})

console.log(resp2)
