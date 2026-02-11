/**
 * Solana Actions / Blinks Types
 *
 * Types for the Solana Actions spec (shareable URLs that embed transactions).
 */

/**
 * Action spec metadata (returned from GET endpoint)
 */
export interface ActionSpec {
  icon: string
  title: string
  description: string
  label: string
  links?: {
    actions: ActionLink[]
  }
  disabled?: boolean
  error?: {
    message: string
  }
}

/**
 * An action link within an ActionSpec
 */
export interface ActionLink {
  label: string
  href: string
  parameters?: ActionParameter[]
}

/**
 * Parameter for an action link
 */
export interface ActionParameter {
  name: string
  label: string
  required?: boolean
  type?: 'text' | 'number' | 'select' | 'email' | 'url'
  options?: Array<{ label: string; value: string }>
  min?: number
  max?: number
  pattern?: string
  patternDescription?: string
}

/**
 * Action POST response (returns a serialized transaction)
 */
export interface ActionResponse {
  transaction: string
  message?: string
}

/**
 * Options for creating an action URL
 */
export interface CreateActionOptions {
  baseUrl: string
  type: ActionType
  params: Record<string, string>
}

/**
 * Supported action types
 */
export type ActionType =
  | 'transfer'
  | 'nft-mint'
  | 'swap'
  | 'vote'
  | 'stake'
  | 'custom'

/**
 * Action handler function type
 */
export type ActionHandler = (
  account: string,
  params: Record<string, string>
) => Promise<ActionResponse>

/**
 * Actions.json manifest
 */
export interface ActionsJson {
  rules: Array<{
    pathPattern: string
    apiPath: string
  }>
}
