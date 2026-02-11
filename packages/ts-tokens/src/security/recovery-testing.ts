/**
 * Recovery Testing
 *
 * Verification and testing utilities for backup recovery flows.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { splitSecret, combineShares } from './recovery'

/**
 * Recovery test result
 */
export interface RecoveryTestResult {
  success: boolean
  error?: string
  details?: Record<string, unknown>
}

/**
 * Test backup recovery by decrypting and validating a backup file
 */
export async function testBackupRecovery(
  backupPath: string,
  password: string
): Promise<RecoveryTestResult> {
  try {
    if (!fs.existsSync(backupPath)) {
      return { success: false, error: `Backup file not found: ${backupPath}` }
    }

    const { loadEncryptedKeypair } = await import('./keyring')
    const dir = path.dirname(backupPath)
    const file = path.basename(backupPath)

    const recoveredKey = loadEncryptedKeypair(password, {
      keyringDir: dir,
      keyringFile: file,
    })

    if (recoveredKey.length !== 64) {
      return {
        success: false,
        error: `Invalid key length: expected 64 bytes, got ${recoveredKey.length}`,
      }
    }

    // Zero out the recovered key from memory
    recoveredKey.fill(0)

    return {
      success: true,
      details: { keyLength: 64, backupPath },
    }
  } catch (err) {
    return {
      success: false,
      error: `Backup recovery failed: ${(err as Error).message}`,
    }
  }
}

/**
 * Test Shamir secret sharing by splitting and recombining a secret
 */
export function testShamirRecovery(
  secret: Uint8Array,
  threshold: number,
  totalShares: number
): RecoveryTestResult {
  try {
    const shares = splitSecret(secret, threshold, totalShares)

    if (shares.length !== totalShares) {
      return {
        success: false,
        error: `Expected ${totalShares} shares, got ${shares.length}`,
      }
    }

    // Test with exact threshold number of shares
    const subsetShares = shares.slice(0, threshold)
    const recovered = combineShares(subsetShares)

    // Verify recovered secret matches original
    if (recovered.length !== secret.length) {
      return {
        success: false,
        error: `Recovered length mismatch: expected ${secret.length}, got ${recovered.length}`,
      }
    }

    for (let i = 0; i < secret.length; i++) {
      if (recovered[i] !== secret[i]) {
        return {
          success: false,
          error: `Byte mismatch at index ${i}: expected ${secret[i]}, got ${recovered[i]}`,
        }
      }
    }

    // Test with different subset of shares
    if (totalShares > threshold) {
      const alternateShares = shares.slice(totalShares - threshold)
      const altRecovered = combineShares(alternateShares)

      for (let i = 0; i < secret.length; i++) {
        if (altRecovered[i] !== secret[i]) {
          return {
            success: false,
            error: `Alternate subset recovery failed at byte ${i}`,
          }
        }
      }
    }

    return {
      success: true,
      details: {
        totalShares,
        threshold,
        secretLength: secret.length,
        testedSubsets: totalShares > threshold ? 2 : 1,
      },
    }
  } catch (err) {
    return {
      success: false,
      error: `Shamir recovery test failed: ${(err as Error).message}`,
    }
  }
}

/**
 * Known screen recording application names
 */
const SCREEN_RECORDING_APPS = [
  'obs', 'OBS', 'obs-studio',
  'loom', 'Loom',
  'screenflow', 'ScreenFlow',
  'camtasia', 'Camtasia',
  'bandicam', 'Bandicam',
  'screencast-o-matic', 'ScreenPal',
  'kazam', 'Kazam',
  'simplescreenrecorder',
  'recordmydesktop',
  'ffmpeg',
  'vlc',
  'quicktime', 'QuickTime Player',
  'ShareX',
  'Snagit',
]

/**
 * Check for known screen recording software running on the system
 */
export async function checkScreenRecordingSoftware(): Promise<{
  detected: boolean
  apps: string[]
  warning?: string
}> {
  try {
    const { execSync } = await import('node:child_process')
    const platform = process.platform

    let output: string
    if (platform === 'win32') {
      output = execSync('tasklist /fo csv /nh', { encoding: 'utf-8', timeout: 5000 })
    } else {
      output = execSync('ps aux', { encoding: 'utf-8', timeout: 5000 })
    }

    const detectedApps: string[] = []
    const lowerOutput = output.toLowerCase()

    for (const app of SCREEN_RECORDING_APPS) {
      if (lowerOutput.includes(app.toLowerCase())) {
        detectedApps.push(app)
      }
    }

    const detected = detectedApps.length > 0
    return {
      detected,
      apps: detectedApps,
      warning: detected
        ? `Screen recording software detected: ${detectedApps.join(', ')}. Do NOT display sensitive keys while recording.`
        : undefined,
    }
  } catch {
    return {
      detected: false,
      apps: [],
      warning: 'Unable to check for screen recording software',
    }
  }
}

/**
 * Check for VM/sandbox environment
 */
async function checkVMEnvironment(): Promise<{
  detected: boolean
  indicators: string[]
}> {
  const indicators: string[] = []

  try {
    const { execSync } = await import('node:child_process')

    if (process.platform === 'linux') {
      try {
        const dmi = execSync('cat /sys/class/dmi/id/product_name 2>/dev/null || true', {
          encoding: 'utf-8',
          timeout: 3000,
        }).trim().toLowerCase()

        const vmNames = ['virtualbox', 'vmware', 'kvm', 'qemu', 'xen', 'hyper-v', 'parallels']
        for (const vm of vmNames) {
          if (dmi.includes(vm)) indicators.push(`VM detected: ${vm}`)
        }
      } catch {
        // Ignore
      }
    }

    // Check common env variables
    const vmEnvVars = ['DOCKER_HOST', 'KUBERNETES_SERVICE_HOST']
    for (const envVar of vmEnvVars) {
      if (process.env[envVar]) {
        indicators.push(`Container environment detected: ${envVar}`)
      }
    }
  } catch {
    // Ignore check failures
  }

  return {
    detected: indicators.length > 0,
    indicators,
  }
}

/**
 * Comprehensive system environment threat check
 */
export async function checkSystemEnvironmentThreats(): Promise<{
  safe: boolean
  threats: string[]
  warnings: string[]
}> {
  const threats: string[] = []
  const warnings: string[] = []

  const screenCheck = await checkScreenRecordingSoftware()
  if (screenCheck.detected) {
    threats.push(`Screen recording software active: ${screenCheck.apps.join(', ')}`)
  }

  const vmCheck = await checkVMEnvironment()
  if (vmCheck.detected) {
    warnings.push(...vmCheck.indicators)
  }

  // Check for SSH session
  if (process.env.SSH_CLIENT || process.env.SSH_CONNECTION) {
    warnings.push('Running in an SSH session — ensure the connection is trusted')
  }

  // Check for tmux/screen (could be shared)
  if (process.env.TMUX || process.env.STY) {
    warnings.push('Running in a terminal multiplexer — ensure the session is not shared')
  }

  return {
    safe: threats.length === 0,
    threats,
    warnings,
  }
}
