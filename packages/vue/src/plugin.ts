/**
 * Vue Tokens Plugin
 *
 * Install the tokens plugin to provide connection and config globally.
 */

import { ref, provide, inject, type App, type InjectionKey, type Ref } from 'vue'
import { Connection } from '@solana/web3.js'
import type { TokenConfig } from 'ts-tokens'
import type { TokensPluginOptions } from './types'

/**
 * Tokens context interface
 */
export interface TokensContext {
  connection: Connection
  config: TokenConfig
}

/**
 * Injection key for tokens context
 */
export const TokensKey: InjectionKey<Ref<TokensContext>> = Symbol('tokens')

/**
 * Create tokens context
 */
export function createTokens(options: TokensPluginOptions): TokensContext {
  const connection = new Connection(options.endpoint, 'confirmed')

  const config: TokenConfig = {
    network: 'devnet',
    rpcUrl: options.endpoint,
    ...options.config,
  } as TokenConfig

  return { connection, config }
}

/**
 * Vue plugin for tokens
 */
export const TokensPlugin = {
  install(app: App, options: TokensPluginOptions) {
    const context = createTokens(options)
    const contextRef = ref(context)

    app.provide(TokensKey, contextRef)

    // Also make available as global property
    app.config.globalProperties.$tokens = context
  },
}

/**
 * Use tokens context in components
 */
export function useTokens(): TokensContext {
  const context = inject(TokensKey)
  if (!context) {
    throw new Error('useTokens must be used within a component that has TokensPlugin installed')
  }
  return context.value
}
