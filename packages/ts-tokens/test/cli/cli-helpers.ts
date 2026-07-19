/**
 * CLI Test Helpers
 *
 * Subprocess-based test runner for CLI commands.
 *
 * Every run is fully isolated from the real user environment:
 *
 * - `HOME`, `XDG_CONFIG_HOME`, and `TOKENS_CONFIG_DIR` point at a fresh
 *   per-run tmpdir, so config overlays, keyrings, and marketplace state can
 *   never leak into (or be influenced by) the real user home.
 * - The working directory defaults to a fresh per-run tmpdir so project-level
 *   config writes (tokens.config.json) never pollute the repository.
 */

import { spawnSync } from 'bun'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
  /** Isolated HOME the CLI process ran with (fresh tmpdir per run). */
  homeDir: string
  /** Working directory the CLI process ran in. */
  cwd: string
}

const PKG_ROOT = new URL('../../', import.meta.url).pathname.replace(/\/$/, '')
const CLI_ENTRY = path.join(PKG_ROOT, 'bin', 'cli.ts')

/**
 * Run a CLI command and capture output
 */
export function runCLI(
  args: string[],
  options: {
    timeout?: number
    env?: Record<string, string>
    cwd?: string
  } = {},
): CLIResult {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-cli-home-'))
  const cwd = options.cwd ?? fs.mkdtempSync(path.join(os.tmpdir(), 'ts-tokens-cli-cwd-'))

  const result = spawnSync({
    cmd: ['bun', CLI_ENTRY, ...args],
    cwd,
    timeout: options.timeout ?? 15000,
    env: {
      ...process.env,
      // Environment isolation (tests may override via options.env)
      HOME: homeDir,
      XDG_CONFIG_HOME: path.join(homeDir, '.config'),
      TOKENS_CONFIG_DIR: path.join(homeDir, '.ts-tokens'),
      ...options.env,
      // Prevent interactive prompts
      CI: '1',
    },
  })

  return {
    stdout: result.stdout ? Buffer.from(result.stdout).toString() : '',
    stderr: result.stderr ? Buffer.from(result.stderr).toString() : '',
    exitCode: result.exitCode ?? 1,
    homeDir,
    cwd,
  }
}
