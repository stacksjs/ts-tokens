/**
 * CLI Environment Isolation Tests
 *
 * Verifies that CLI subprocess runs can never read from or write to the real
 * user home directory, and that config writes land in the right place
 * (project config by default, user-level overlay with --global).
 */

import { describe, test, expect } from 'bun:test'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { runCLI } from './cli-helpers'

/** Snapshot of the real user-level overlay, taken before a CLI run. */
function snapshotRealOverlay(): { exists: boolean; content: string | null; mtimeMs: number | null } {
  const overlayPath = path.join(os.homedir(), '.ts-tokens', 'config.json')
  try {
    const stat = fs.statSync(overlayPath)
    return { exists: true, content: fs.readFileSync(overlayPath, 'utf-8'), mtimeMs: stat.mtimeMs }
  } catch {
    return { exists: false, content: null, mtimeMs: null }
  }
}

function expectRealOverlayUnchanged(before: ReturnType<typeof snapshotRealOverlay>): void {
  const after = snapshotRealOverlay()
  expect(after.exists).toBe(before.exists)
  expect(after.content).toBe(before.content)
  expect(after.mtimeMs).toBe(before.mtimeMs)
}

describe('CLI environment isolation', () => {
  test('runCLI runs with an isolated HOME (not the real user home)', () => {
    const { homeDir } = runCLI(['version'])
    expect(homeDir).not.toBe(os.homedir())
    expect(fs.existsSync(homeDir)).toBe(true)
  })

  test('config:set --global writes the overlay into the ISOLATED home, not the real one', () => {
    const before = snapshotRealOverlay()

    const { exitCode, homeDir } = runCLI(['config:set', '--global', 'network', 'testnet'])
    expect(exitCode).toBe(0)

    // The overlay exists inside the fake home…
    const fakeOverlay = path.join(homeDir, '.ts-tokens', 'config.json')
    expect(fs.existsSync(fakeOverlay)).toBe(true)
    expect(JSON.parse(fs.readFileSync(fakeOverlay, 'utf-8')).network).toBe('testnet')

    // …and the real user home was not touched.
    expectRealOverlayUnchanged(before)
  })

  test('config:network --global writes the ISOLATED overlay, not the real one', () => {
    const before = snapshotRealOverlay()

    const { exitCode, homeDir } = runCLI(['config:network', 'mainnet-beta', '--global'])
    expect(exitCode).toBe(0)

    const fakeOverlay = path.join(homeDir, '.ts-tokens', 'config.json')
    expect(fs.existsSync(fakeOverlay)).toBe(true)
    expect(JSON.parse(fs.readFileSync(fakeOverlay, 'utf-8')).network).toBe('mainnet-beta')

    expectRealOverlayUnchanged(before)
  })

  test('wallet:generate --output keypair + config:set does not touch the real home', () => {
    const before = snapshotRealOverlay()

    const gen = runCLI(['wallet:generate'])
    expect(gen.exitCode).toBe(0)
    const set = runCLI(['config:set', 'verbose', 'true'])
    expect(set.exitCode).toBe(0)

    expectRealOverlayUnchanged(before)
  })
})

describe('config:set project vs --global writes', () => {
  test('config:set writes the project config (tokens.config.json) by default', () => {
    const before = snapshotRealOverlay()

    const { exitCode, cwd, stdout } = runCLI(['config:set', 'network', 'testnet'])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('(project)')

    const projectConfig = path.join(cwd, 'tokens.config.json')
    expect(fs.existsSync(projectConfig)).toBe(true)
    expect(JSON.parse(fs.readFileSync(projectConfig, 'utf-8')).network).toBe('testnet')

    // No user-level overlay was written anywhere real.
    expectRealOverlayUnchanged(before)
  })

  test('config:set updates an existing project tokens.config.json', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-cli-proj-'))
    fs.writeFileSync(path.join(cwd, 'tokens.config.json'), JSON.stringify({ network: 'devnet', verbose: false }))

    const { exitCode } = runCLI(['config:set', 'verbose', 'true'], { cwd })
    expect(exitCode).toBe(0)

    const written = JSON.parse(fs.readFileSync(path.join(cwd, 'tokens.config.json'), 'utf-8'))
    expect(written.verbose).toBe(true)
    expect(written.network).toBe('devnet')
  })

  test('config:set refuses to rewrite a TypeScript project config', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-cli-tsproj-'))
    fs.writeFileSync(path.join(cwd, 'tokens.config.ts'), 'export default { network: "devnet" }\n')

    const { exitCode, stderr } = runCLI(['config:set', 'network', 'testnet'], { cwd })
    expect(exitCode).toBe(1)
    expect(stderr).toContain('tokens.config.ts')
    expect(stderr).toContain('--global')
  })

  test('nested keys are type-coerced and empty strings stay empty', () => {
    const { exitCode, cwd } = runCLI(['config:set', 'wallet.keypairPath', ''])
    expect(exitCode).toBe(0)

    const written = JSON.parse(fs.readFileSync(path.join(cwd, 'tokens.config.json'), 'utf-8'))
    // '' must NOT become 0 (Number('') === 0 in the old code)
    expect(written.wallet.keypairPath).toBe('')
  })

  test('nested numeric and boolean leaves are coerced', () => {
    const { exitCode, cwd } = runCLI(['config:set', 'a.b', 'true'])
    expect(exitCode).toBe(0)
    const written = JSON.parse(fs.readFileSync(path.join(cwd, 'tokens.config.json'), 'utf-8'))
    expect(written.a.b).toBe(true)

    const num = runCLI(['config:set', 'a.c', '42'], { cwd })
    expect(num.exitCode).toBe(0)
    const written2 = JSON.parse(fs.readFileSync(path.join(cwd, 'tokens.config.json'), 'utf-8'))
    expect(written2.a.c).toBe(42)
  })

  test('config:network writes the project config by default', () => {
    const { exitCode, cwd } = runCLI(['config:network', 'testnet'])
    expect(exitCode).toBe(0)

    const projectConfig = path.join(cwd, 'tokens.config.json')
    expect(fs.existsSync(projectConfig)).toBe(true)
    expect(JSON.parse(fs.readFileSync(projectConfig, 'utf-8')).network).toBe('testnet')
  })

  test('project config written by config:set is picked up by config:get', () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-cli-roundtrip-'))
    const set = runCLI(['config:set', 'network', 'testnet'], { cwd })
    expect(set.exitCode).toBe(0)

    const get = runCLI(['config:get', 'network'], { cwd })
    expect(get.exitCode).toBe(0)
    expect(get.stdout).toContain('testnet')
  })
})

describe('batch:failures', () => {
  test('lists failed items from a recovery state file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-batch-'))
    const recoveryFile = path.join(dir, 'recovery.json')
    fs.writeFileSync(recoveryFile, JSON.stringify({
      id: 'recovery-test-1',
      operation: 'batch-transfer',
      status: 'partial-failure',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { index: 0, recipient: 'SuccessAddr111111111111111111111111111111111', status: 'success', signature: 'sig1' },
        { index: 1, recipient: 'FailedAddr2222222222222222222222222222222222', status: 'failed', error: 'insufficient funds' },
      ],
    }))

    const { stdout, exitCode } = runCLI(['batch:failures', recoveryFile])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('Failed Items (1)')
    expect(stdout).toContain('FailedAddr2222222222222222222222222222222222')
    expect(stdout).toContain('insufficient funds')
  })

  test('reports when there are no failed items', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-batch-'))
    const recoveryFile = path.join(dir, 'recovery.json')
    fs.writeFileSync(recoveryFile, JSON.stringify({
      id: 'recovery-test-2',
      operation: 'batch-transfer',
      status: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: [
        { index: 0, recipient: 'SuccessAddr111111111111111111111111111111111', status: 'success', signature: 'sig1' },
      ],
    }))

    const { stdout, exitCode } = runCLI(['batch:failures', recoveryFile])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('No failed items')
  })
})
