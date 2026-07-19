import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { uploadWithFallback, clearStorageAdapters } from '../src/storage'
import { clearWallet } from '../src/drivers/solana/wallet'
import { createTestConfig } from './helpers'

const originalFetch = globalThis.fetch

beforeEach(() => {
  clearStorageAdapters()
  clearWallet()
  delete process.env.PINATA_JWT
})

afterEach(() => {
  globalThis.fetch = originalFetch
  delete process.env.PINATA_JWT
})

/** A config where every default-chain provider fails deterministically. */
function failingConfig() {
  return createTestConfig({
    wallet: { keypairPath: '/nonexistent-ts-tokens-test/keypair.json' },
  })
}

describe('uploadWithFallback', () => {
  test('default chain excludes local and aggregates all provider errors', async () => {
    // Belt and braces: any accidental network call fails too.
    globalThis.fetch = (async () => {
      throw new Error('network disabled in test')
    }) as any

    const err = await uploadWithFallback('hello', failingConfig()).catch(e => e)

    expect(err).toBeInstanceOf(Error)
    expect(err.message).toContain('All storage providers failed')
    // Each default provider's failure reason is listed...
    expect(err.message).toMatch(/arweave:/)
    expect(err.message).toMatch(/ipfs:/)
    expect(err.message).toMatch(/shadow-drive:/)
    // ...and local is NOT in the default chain.
    expect(err.message).not.toMatch(/^ {2}local:/m)
    // Arweave failed fast at adapter construction with an actionable message.
    expect(err.message).toMatch(/arweave: Storage provider "arweave" requires a Solana keypair/)
  })

  test('arweave adapter construction succeeds when a keypair is configured', async () => {
    const { Keypair } = await import('@solana/web3.js')
    const { setWallet } = await import('../src/drivers/solana/wallet')
    setWallet(Keypair.generate())

    globalThis.fetch = (async () => {
      throw new Error('offline')
    }) as any

    const err = await uploadWithFallback('hello', createTestConfig()).catch(e => e)
    // Arweave got past construction and failed at the network layer instead.
    expect(err.message).toMatch(/arweave: Failed to get upload price/)
    expect(err.message).toContain('offline')
  })

  test('opt-in local provider succeeds and warns the URL is not public', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-storage-'))
    const warnings: string[] = []
    const originalWarn = console.warn
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map(String).join(' '))
    }

    try {
      const config = createTestConfig({
        storage: {
          provider: 'local',
          local: { baseDir: tmp, baseUrl: 'http://localhost:9999/storage' },
        },
      })

      const result = await uploadWithFallback(
        'hello local',
        config,
        { contentType: 'text/plain' },
        ['local']
      )

      expect(result.provider).toBe('local')
      expect(result.url).toContain('http://localhost:9999/storage/')
      expect(fs.existsSync(path.join(tmp, result.id))).toBe(true)
      expect(warnings.some(w => w.includes('NOT publicly resolvable'))).toBe(true)
    } finally {
      console.warn = originalWarn
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })

  test('falls through a failing provider to the next one in the list', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-storage-'))
    const originalWarn = console.warn
    console.warn = () => {}

    try {
      const config = createTestConfig({
        wallet: { keypairPath: '/nonexistent-ts-tokens-test/keypair.json' },
        storage: {
          provider: 'local',
          local: { baseDir: tmp, baseUrl: 'http://localhost:9999/storage' },
        },
      })

      // arweave fails (no keypair), local is explicitly opted in afterwards.
      const result = await uploadWithFallback(
        'fallback data',
        config,
        undefined,
        ['arweave', 'local']
      )
      expect(result.provider).toBe('local')
    } finally {
      console.warn = originalWarn
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})
