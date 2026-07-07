/**
 * Tokens Provider
 *
 * Context provider for token operations.
 */

import React, { createContext, useContext, useMemo, type ReactNode } from 'react'
import { Connection } from '@solana/web3.js'
import type { TokenConfig } from 'ts-tokens'

/**
 * Tokens context value
 */
export interface TokensContextValue {
  connection: Connection
  config: TokenConfig
}

/**
 * Tokens context
 */
const TokensContext = createContext<TokensContextValue | null>(null)

/**
 * Stable default for the optional `config` prop. Defined at module scope so the
 * default does not create a new object on every render (which would defeat the
 * useMemo below and recreate the context value each render).
 */
const EMPTY_CONFIG: Partial<TokenConfig> = {}

/**
 * Tokens provider props
 */
export interface TokensProviderProps {
  children: ReactNode
  endpoint: string
  config?: Partial<TokenConfig>
}

/**
 * Tokens provider component
 */
export function TokensProvider({
  children,
  endpoint,
  config = EMPTY_CONFIG,
}: TokensProviderProps): JSX.Element {
  const connection = useMemo(() => new Connection(endpoint, 'confirmed'), [endpoint])

  const value = useMemo<TokensContextValue>(
    () => ({
      connection,
      config: {
        network: 'devnet',
        rpcUrl: endpoint,
        ...config,
      } as TokenConfig,
    }),
    [connection, endpoint, config]
  )

  return (
    <TokensContext.Provider value={value}>
      {children}
    </TokensContext.Provider>
  )
}

/**
 * Use tokens context hook
 */
export function useTokensContext(): TokensContextValue {
  const context = useContext(TokensContext)
  if (!context) {
    throw new Error('useTokensContext must be used within a TokensProvider')
  }
  return context
}

/**
 * Use connection hook
 */
export function useConnection(): Connection {
  const { connection } = useTokensContext()
  return connection
}

/**
 * Use config hook
 */
export function useConfig(): TokenConfig {
  const { config } = useTokensContext()
  return config
}
