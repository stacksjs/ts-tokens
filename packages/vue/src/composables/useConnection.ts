/**
 * useConnection Composable
 *
 * Access Solana connection and config.
 */

import { computed } from 'vue'
import type { Connection } from '@solana/web3.js'
import type { TokenConfig } from 'ts-tokens'
import { useTokens } from '../plugin'

/**
 * Get the Solana connection
 */
export function useConnection(): Connection {
  const { connection } = useTokens()
  return connection
}

/**
 * Get the token config
 */
export function useConfig(): TokenConfig {
  const { config } = useTokens()
  return config
}
