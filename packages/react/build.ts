import { dts } from 'bun-plugin-dtsx'

// Multi-entry library build so the published exports map (`./components`,
// `./hooks`) resolves to real files, with TypeScript declarations emitted
// alongside each entry.
async function main(): Promise<void> {
  const result = await Bun.build({
    target: 'browser',
    entrypoints: [
      './src/index.ts',
      './src/components/index.ts',
      './src/hooks/index.ts',
    ],
    outdir: './dist',
    sourcemap: 'external',
    external: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'ts-tokens',
      'ts-governance',
      '@solana/web3.js',
      '@solana/spl-token',
      '@solana/wallet-adapter-react',
      '@solana/wallet-adapter-react-ui',
    ],
    plugins: [dts()],
  })

  if (!result.success) {
    console.error('Failed to build react-tokens:', result.logs)
    process.exit(1)
  }
}

main()
