/**
 * CLI Test Helpers
 *
 * Subprocess-based test runner for CLI commands.
 */

import { spawnSync } from 'bun'

export interface CLIResult {
  stdout: string
  stderr: string
  exitCode: number
}

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
  const result = spawnSync({
    cmd: ['bun', 'bin/cli.ts', ...args],
    cwd: options.cwd ?? new URL('../../', import.meta.url).pathname.replace(/\/$/, ''),
    timeout: options.timeout ?? 15000,
    env: {
      ...process.env,
      ...options.env,
      // Prevent interactive prompts
      CI: '1',
    },
  })

  return {
    stdout: result.stdout ? Buffer.from(result.stdout).toString() : '',
    stderr: result.stderr ? Buffer.from(result.stderr).toString() : '',
    exitCode: result.exitCode ?? 1,
  }
}
