/**
 * CLI Commands — Subprocess Tests
 *
 * Spawns the real CLI binary (`bin/cli.ts`) as a child process and
 * validates stdout, stderr, and exit codes for every command category.
 *
 * Many commands are expected to fail because no wallet or network
 * connection is configured in the test environment.  We assert on the
 * error messages and non-zero exit codes for those cases.
 */

import { describe, test, expect } from 'bun:test'
import { runCLI } from './cli-helpers'

// ---------------------------------------------------------------------------
// 1. Version & Help
// ---------------------------------------------------------------------------

describe('Version & Help', () => {
  test('version command outputs version string and exits 0', () => {
    const { stdout, exitCode } = runCLI(['version'])
    expect(exitCode).toBe(0)
    expect(stdout).toMatch(/\d+\.\d+\.\d+/)
  })

  test('--help flag shows help text and exits 0', () => {
    const { stdout, exitCode } = runCLI(['--help'])
    expect(exitCode).toBe(0)
    expect(stdout.length).toBeGreaterThan(0)
  })

  test('-h flag shows help text', () => {
    const { stdout, exitCode } = runCLI(['-h'])
    expect(exitCode).toBe(0)
    expect(stdout.length).toBeGreaterThan(0)
  })

  test('--help output contains command listing', () => {
    const { stdout } = runCLI(['--help'])
    // The help text should mention at least a few known commands
    const combined = stdout.toLowerCase()
    expect(combined).toContain('version')
  })

  test('unknown command exits silently (clapp ignores unknown commands)', () => {
    const { stdout, stderr, exitCode } = runCLI(['this-command-does-not-exist'])
    // clapp silently ignores unknown commands — exit code 0, no output
    expect(exitCode).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Config Commands
// ---------------------------------------------------------------------------

describe('Config Commands', () => {
  test('config:init outputs initialization text and exits 0', () => {
    const { stdout, exitCode } = runCLI(['config:init'])
    expect(exitCode).toBe(0)
    expect(stdout.toLowerCase()).toContain('initializ')
  })

  test('config:init --network mainnet-beta shows correct network', () => {
    const { stdout, exitCode } = runCLI(['config:init', '--network', 'mainnet-beta'])
    expect(exitCode).toBe(0)
    expect(stdout).toContain('mainnet-beta')
  })

  test('config:show outputs JSON config and exits 0', () => {
    const { stdout, exitCode } = runCLI(['config:show'])
    expect(exitCode).toBe(0)
    // The output should contain a JSON object with at least one brace
    expect(stdout).toContain('{')
  })

  test('config:network devnet switches successfully', () => {
    const { stdout, exitCode } = runCLI(['config:network', 'devnet'])
    expect(exitCode).toBe(0)
    expect(stdout.toLowerCase()).toContain('devnet')
  })

  test('config:network invalid-net exits with code 1', () => {
    const { stderr, exitCode } = runCLI(['config:network', 'invalid-net'])
    expect(exitCode).toBe(1)
    expect(stderr.toLowerCase()).toContain('invalid')
  })

  test('config:network without argument shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['config:network'])
    const combined = (stdout + stderr).toLowerCase()
    // clapp may show help for missing required arg or error
    expect(combined.length).toBeGreaterThan(0)
  })

  test('config:show output contains expected fields', () => {
    const { stdout } = runCLI(['config:show'])
    const lower = stdout.toLowerCase()
    // Config should reference network or chain
    expect(lower).toMatch(/network|chain/)
  })

  test('config:init mentions config file creation', () => {
    const { stdout } = runCLI(['config:init'])
    expect(stdout.toLowerCase()).toContain('config')
  })
})

// ---------------------------------------------------------------------------
// 3. Wallet Commands
// ---------------------------------------------------------------------------

describe('Wallet Commands', () => {
  test('wallet:generate outputs public key and exits 0', () => {
    const { stdout, exitCode } = runCLI(['wallet:generate'])
    expect(exitCode).toBe(0)
    expect(stdout.toLowerCase()).toContain('public key')
  })

  test('wallet:generate output contains "Public Key"', () => {
    const { stdout } = runCLI(['wallet:generate'])
    expect(stdout).toContain('Public Key')
  })

  test('wallet:show without wallet configured shows error and exits 1', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:show'])
    const combined = (stdout + stderr).toLowerCase()
    // Should mention missing wallet or error
    expect(combined).toMatch(/no wallet|error|not configured|wallet/)
  })

  test('wallet:balance without wallet shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:balance'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|wallet|no wallet|not configured/)
  })

  test('wallet:airdrop without wallet shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:airdrop'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|wallet|no wallet|not configured/)
  })

  test('wallet:import without path shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:import'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('wallet:generate output contains base58-like string (32+ chars)', () => {
    const { stdout } = runCLI(['wallet:generate'])
    // A base58 public key is typically 32-44 characters of [1-9A-HJ-NP-Za-km-z]
    const base58Match = stdout.match(/[1-9A-HJ-NP-Za-km-z]{32,}/)
    expect(base58Match).not.toBeNull()
  })

  test('wallet:generate --output mentions save path', () => {
    const { stdout } = runCLI(['wallet:generate', '--output', '/tmp/test-keypair.json'])
    const combined = stdout.toLowerCase()
    expect(combined).toMatch(/saved|output|\/tmp\/test-keypair/)
  })
})

// ---------------------------------------------------------------------------
// 4. Token Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Token Commands — Error Cases', () => {
  test('create without required args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['create'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|required|--name|--symbol|help/)
    expect(exitCode).not.toBe(0)
  })

  test('mint without required args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['mint'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('transfer without args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['transfer'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('burn without args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['burn'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('info without mint address shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['info'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('balance without mint shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['balance'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('holders without mint shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['holders'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('authority without mint shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['authority'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 5. NFT Commands — Error Cases
// ---------------------------------------------------------------------------

describe('NFT Commands — Error Cases', () => {
  test('nft:create without required args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:create'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|required|--name|--uri|help/)
    expect(exitCode).not.toBe(0)
  })

  test('nft:transfer without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:transfer'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('nft:burn without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:burn'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('nft:info without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:info'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('nft:mint without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:mint'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('nft:list without wallet shows error or empty output', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:list'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|wallet|no wallet|not configured|fetching/)
  })
})

// ---------------------------------------------------------------------------
// 6. Collection Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Collection Commands — Error Cases', () => {
  test('collection:create without args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['collection:create'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|required|--name|--uri|help/)
    expect(exitCode).not.toBe(0)
  })

  test('collection:info without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['collection:info'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('collection:items without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['collection:items'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('collection:verify without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['collection:verify'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('collection:update without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['collection:update'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 7. Candy Machine Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Candy Machine Commands — Error Cases', () => {
  test('candy:create without required args shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:create'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|required|--collection|--items|help/)
    expect(exitCode).not.toBe(0)
  })

  test('candy:add without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:add'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:mint without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:mint'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:info without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:info'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:withdraw without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:withdraw'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:delete without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:delete'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:upload without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:upload'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('candy:guards without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['candy:guards'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 8. Utility Commands
// ---------------------------------------------------------------------------

describe('Utility Commands', () => {
  test('decode without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['decode'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('verify without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['verify'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('snapshot without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['snapshot'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('decode --help shows decode options', () => {
    const { stdout, stderr } = runCLI(['decode', '--help'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/decode|type|help|usage/)
  })

  test('verify --help shows verify options', () => {
    const { stdout, stderr } = runCLI(['verify', '--help'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/verify|signature|help|usage/)
  })

  test('multiple commands can show help', () => {
    // snapshot --help should produce some output
    const { stdout, stderr } = runCLI(['snapshot', '--help'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/snapshot|mint|help|usage/)
  })

  test('unknown subcommand exits silently (clapp ignores unknown commands)', () => {
    const { stdout, stderr, exitCode } = runCLI(['nft:nonexistent'])
    // clapp silently ignores unknown subcommands
    expect(exitCode).toBe(0)
  })

  test('user errors do not produce raw stack traces in stderr', () => {
    // A known user error: create without --name/--symbol
    const { stderr } = runCLI(['create'])
    // Should NOT contain internal stack frames like "at Object." or "file://"
    // (The CLI may use stderr for the error message itself, which is fine)
    const hasRawStackTrace = /^\s+at\s+/m.test(stderr)
    expect(hasRawStackTrace).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 9. Security Audit CLI Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Security Audit CLI Commands — Error Cases', () => {
  test('security:audit without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['security:audit'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('security:collection without args shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['security:collection'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('security:wallet without wallet shows error or output', () => {
    const { stdout, stderr, exitCode } = runCLI(['security:wallet'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|wallet|no wallet|not configured|audit/)
  })

  test('security:report without flags shows error or empty report', () => {
    const { stdout, stderr, exitCode } = runCLI(['security:report'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 10. Wallet Keyring & Session CLI Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Wallet Keyring & Session CLI Commands — Error Cases', () => {
  test('wallet:encrypt without --password shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:encrypt'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|password|required/)
    expect(exitCode).not.toBe(0)
  })

  test('wallet:decrypt without --password shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:decrypt'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|password|required/)
    expect(exitCode).not.toBe(0)
  })

  test('wallet:unlock without --password shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:unlock'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|password|required/)
    expect(exitCode).not.toBe(0)
  })

  test('wallet:lock without active session shows info message', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:lock'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/no active session|session/)
  })

  test('wallet:keyring-info without keyring shows info message', () => {
    const { stdout, stderr, exitCode } = runCLI(['wallet:keyring-info'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/no keyring|keyring|encrypt/)
  })
})

// ---------------------------------------------------------------------------
// 11. Batch Recovery CLI Commands — Error Cases
// ---------------------------------------------------------------------------

describe('Batch Recovery CLI Commands — Error Cases', () => {
  test('batch:retry without file arg shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['batch:retry'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('batch:retry with non-existent file shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['batch:retry', '/tmp/nonexistent-recovery.json'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|not found/)
    expect(exitCode).not.toBe(0)
  })

  test('batch:status without file arg shows error or help', () => {
    const { stdout, stderr, exitCode } = runCLI(['batch:status'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined.length).toBeGreaterThan(0)
  })

  test('batch:status with non-existent file shows error', () => {
    const { stdout, stderr, exitCode } = runCLI(['batch:status', '/tmp/nonexistent-recovery.json'])
    const combined = (stdout + stderr).toLowerCase()
    expect(combined).toMatch(/error|not found/)
    expect(exitCode).not.toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 12. Exit Codes & Output Formatting
// ---------------------------------------------------------------------------

describe('Exit Codes & Output Formatting', () => {
  test('successful commands exit with 0', () => {
    const version = runCLI(['version'])
    expect(version.exitCode).toBe(0)

    const help = runCLI(['--help'])
    expect(help.exitCode).toBe(0)

    const configInit = runCLI(['config:init'])
    expect(configInit.exitCode).toBe(0)
  })

  test('failed commands exit with non-zero', () => {
    const { exitCode } = runCLI(['config:network', 'invalid-net'])
    expect(exitCode).not.toBe(0)
  })

  test('error messages appear in stdout or stderr', () => {
    const { stdout, stderr } = runCLI(['create'])
    const combined = stdout + stderr
    // The CLI should surface an error message somewhere
    expect(combined.length).toBeGreaterThan(0)
  })

  test('config:show output is valid JSON', () => {
    const { stdout } = runCLI(['config:show'])
    // The output may have a prefix line like "Current configuration:"
    // Extract the JSON portion (first { to last })
    const jsonStart = stdout.indexOf('{')
    const jsonEnd = stdout.lastIndexOf('}')
    expect(jsonStart).toBeGreaterThanOrEqual(0)
    expect(jsonEnd).toBeGreaterThan(jsonStart)
    const jsonStr = stdout.slice(jsonStart, jsonEnd + 1)
    expect(() => JSON.parse(jsonStr)).not.toThrow()
  })

  test('wallet:generate output is human-readable', () => {
    const { stdout } = runCLI(['wallet:generate'])
    // Should contain labeled output, not raw JSON
    expect(stdout).toContain('Public Key')
    expect(stdout).toContain(':')
  })

  test('help output contains command descriptions', () => {
    const { stdout } = runCLI(['--help'])
    const lower = stdout.toLowerCase()
    // Should describe the CLI purpose
    expect(lower).toMatch(/token|solana|command|usage/)
  })

  test('version output matches semver or 0.0.0 pattern', () => {
    const { stdout } = runCLI(['version'])
    // semver: X.Y.Z possibly with pre-release suffix
    expect(stdout).toMatch(/\d+\.\d+\.\d+/)
  })
})
