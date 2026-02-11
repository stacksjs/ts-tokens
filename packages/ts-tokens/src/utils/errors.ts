/**
 * Error Types and Handling
 *
 * Comprehensive error types with actionable messages.
 */

/**
 * Base error class for ts-tokens
 */
export class TokensError extends Error {
  code: string
  details?: Record<string, unknown>

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'TokensError'
    this.code = code
    this.details = details
  }
}

/**
 * Insufficient balance error
 */
export class InsufficientBalanceError extends TokensError {
  constructor(required: number, available: number, currency = 'SOL') {
    super(
      `Insufficient ${currency} balance: need ${required}, have ${available}`,
      'INSUFFICIENT_BALANCE',
      { required, available, currency }
    )
    this.name = 'InsufficientBalanceError'
  }
}

/**
 * Invalid address error
 */
export class InvalidAddressError extends TokensError {
  constructor(address: string, reason?: string) {
    super(
      `Invalid address: ${address}${reason ? ` (${reason})` : ''}`,
      'INVALID_ADDRESS',
      { address, reason }
    )
    this.name = 'InvalidAddressError'
  }
}

/**
 * Authority error
 */
export class AuthorityError extends TokensError {
  constructor(message: string, authorityType: string) {
    super(message, 'AUTHORITY_ERROR', { authorityType })
    this.name = 'AuthorityError'
  }
}

/**
 * Transaction error
 */
export class TransactionError extends TokensError {
  signature?: string

  constructor(message: string, signature?: string, details?: Record<string, unknown>) {
    super(message, 'TRANSACTION_ERROR', { signature, ...details })
    this.name = 'TransactionError'
    this.signature = signature
  }
}

/**
 * RPC error
 */
export class RpcError extends TokensError {
  endpoint?: string

  constructor(message: string, endpoint?: string) {
    super(message, 'RPC_ERROR', { endpoint })
    this.name = 'RpcError'
    this.endpoint = endpoint
  }
}

/**
 * Validation error
 *
 * When `validOptions` is provided alongside an invalid `field` value,
 * the error message is automatically enriched with a "Did you mean?"
 * suggestion using Levenshtein distance matching.
 */
export class ValidationError extends TokensError {
  field?: string
  suggestion?: string

  constructor(message: string, field?: string, validOptions?: string[]) {
    let enrichedMessage = message
    let suggestion: string | undefined

    if (field && validOptions && validOptions.length > 0) {
      suggestion = didYouMean(field, validOptions)
      if (suggestion) {
        enrichedMessage = `${message}. Did you mean "${suggestion}"?`
      }
    }

    super(enrichedMessage, 'VALIDATION_ERROR', { field, suggestion })
    this.name = 'ValidationError'
    this.field = field
    this.suggestion = suggestion
  }
}

/**
 * Configuration error
 */
export class ConfigError extends TokensError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR')
    this.name = 'ConfigError'
  }
}

/**
 * Network error
 */
export class NetworkError extends TokensError {
  constructor(message: string, network?: string) {
    super(message, 'NETWORK_ERROR', { network })
    this.name = 'NetworkError'
  }
}

/**
 * Parse Solana transaction error
 */
export function parseTransactionError(error: unknown): TokensError {
  const message = error instanceof Error ? error.message : String(error)

  // Common Solana errors
  if (message.includes('insufficient funds')) {
    return new InsufficientBalanceError(0, 0)
  }

  if (message.includes('invalid account owner')) {
    return new AuthorityError('Invalid account owner', 'owner')
  }

  if (message.includes('custom program error')) {
    const match = message.match(/custom program error: 0x(\w+)/)
    if (match) {
      return new TransactionError(`Program error: 0x${match[1]}`, undefined, {
        errorCode: match[1],
      })
    }
  }

  if (message.includes('blockhash not found')) {
    return new TransactionError('Transaction expired. Please retry.', undefined, {
      reason: 'blockhash_expired',
    })
  }

  return new TransactionError(message)
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: TokensError): string {
  switch (error.code) {
    case 'INSUFFICIENT_BALANCE':
      return `You don't have enough funds. ${error.message}`
    case 'INVALID_ADDRESS':
      return `The address provided is not valid. Please check and try again.`
    case 'AUTHORITY_ERROR':
      return `You don't have permission for this operation. ${error.message}`
    case 'TRANSACTION_ERROR':
      return `Transaction failed. ${error.message}`
    case 'RPC_ERROR':
      return `Network connection issue. Please try again later.`
    case 'VALIDATION_ERROR':
      return `Invalid input. ${error.message}`
    case 'CONFIG_ERROR':
      return `Configuration error. ${error.message}`
    default:
      return error.message
  }
}

/**
 * Compute Levenshtein distance between two strings.
 *
 * @param a - First string
 * @param b - Second string
 * @returns The edit distance between the two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const la = a.length
  const lb = b.length
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0))

  for (let i = 0; i <= la; i++) dp[i][0] = i
  for (let j = 0; j <= lb; j++) dp[0][j] = j

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      )
    }
  }

  return dp[la][lb]
}

/**
 * Suggest the closest match from a list of valid options.
 *
 * Uses Levenshtein distance to find the most similar string.
 * Returns `undefined` if no option is close enough (threshold: half the input length + 2).
 *
 * @param input - The invalid value the user provided
 * @param validOptions - Array of valid option strings
 * @returns The closest matching option, or undefined if none is close enough
 *
 * @example
 * ```ts
 * didYouMean('trasfer', ['transfer', 'mint', 'burn'])
 * // => 'transfer'
 * ```
 */
export function didYouMean(input: string, validOptions: string[]): string | undefined {
  if (validOptions.length === 0) return undefined

  const lower = input.toLowerCase()
  let bestMatch: string | undefined
  let bestDistance = Infinity

  for (const option of validOptions) {
    const distance = levenshteinDistance(lower, option.toLowerCase())
    if (distance < bestDistance) {
      bestDistance = distance
      bestMatch = option
    }
  }

  // Only suggest if the distance is reasonable (within half the input length + 2)
  const threshold = Math.floor(lower.length / 2) + 2
  return bestDistance <= threshold ? bestMatch : undefined
}

/**
 * Error codes documentation
 */
export const ERROR_CODES = {
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    description: 'Not enough SOL or tokens to complete the operation',
    resolution: 'Add more funds to your wallet',
  },
  INVALID_ADDRESS: {
    code: 'INVALID_ADDRESS',
    description: 'The provided address is not a valid Solana address',
    resolution: 'Verify the address format and try again',
  },
  AUTHORITY_ERROR: {
    code: 'AUTHORITY_ERROR',
    description: 'Missing required authority for the operation',
    resolution: 'Ensure you have the correct authority or permissions',
  },
  TRANSACTION_ERROR: {
    code: 'TRANSACTION_ERROR',
    description: 'Transaction failed to execute',
    resolution: 'Check the error details and retry',
  },
  RPC_ERROR: {
    code: 'RPC_ERROR',
    description: 'Failed to communicate with the Solana network',
    resolution: 'Try a different RPC endpoint or wait and retry',
  },
  VALIDATION_ERROR: {
    code: 'VALIDATION_ERROR',
    description: 'Input validation failed',
    resolution: 'Check your input values and try again',
  },
  CONFIG_ERROR: {
    code: 'CONFIG_ERROR',
    description: 'Configuration is invalid or missing',
    resolution: 'Check your tokens.config.ts file',
  },
  NETWORK_ERROR: {
    code: 'NETWORK_ERROR',
    description: 'Network-related error',
    resolution: 'Check your network connection and RPC endpoint',
  },
} as const
