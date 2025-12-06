/**
 * Tokens Provider
 *
 * Context provider for token operations.
 */

import type { ReactNode } from 'react'
import type { TokenConfig } from 'ts-tokens'
import { Connection } from '@solana/web3.js'
import React, { createContext, useContext, useMemo } from 'react'

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
  config = {},
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
    [connection, endpoint, config],
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
