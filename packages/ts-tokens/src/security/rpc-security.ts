/**
 * RPC Security
 *
 * Multi-provider quorum checks and RPC manipulation detection.
 */

/**
 * RPC verification config
 */
export interface RPCVerificationConfig {
  endpoints: string[]
  quorumSize?: number
  timeoutMs?: number
}

/**
 * RPC response entry
 */
export interface RPCResponseEntry {
  endpoint: string
  result: unknown
  latencyMs: number
  error?: string
}

/**
 * RPC manipulation detection result
 */
export interface RPCManipulationResult {
  manipulated: boolean
  divergentEndpoints: string[]
  details?: string
}

/**
 * RPC endpoint trust result
 */
export interface RPCTrustResult {
  trusted: boolean
  warnings: string[]
}

const KNOWN_TRUSTED_DOMAINS = [
  'api.mainnet-beta.solana.com',
  'api.devnet.solana.com',
  'api.testnet.solana.com',
  'solana-api.projectserum.com',
  'rpc.helius.xyz',
  'mainnet.helius-rpc.com',
  'rpc.ankr.com',
  'solana-mainnet.g.alchemy.com',
  'solana.getblock.io',
  'solana-mainnet.phantom.app',
]

/**
 * Verify an RPC response by querying multiple providers
 */
export async function verifyRPCResponse(
  method: string,
  params: unknown[],
  config: RPCVerificationConfig
): Promise<{ verified: boolean; responses: RPCResponseEntry[] }> {
  const quorum = config.quorumSize ?? Math.ceil(config.endpoints.length / 2)
  const timeout = config.timeoutMs ?? 10000

  const responses: RPCResponseEntry[] = await Promise.all(
    config.endpoints.map(async (endpoint) => {
      const start = Date.now()
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            params,
          }),
          signal: AbortSignal.timeout(timeout),
        })

        const data = await response.json() as { result?: unknown; error?: { message: string } }
        return {
          endpoint,
          result: data.result ?? null,
          latencyMs: Date.now() - start,
          error: data.error?.message,
        }
      } catch (err) {
        return {
          endpoint,
          result: null,
          latencyMs: Date.now() - start,
          error: (err as Error).message,
        }
      }
    })
  )

  const successful = responses.filter(r => !r.error)
  if (successful.length < quorum) {
    return { verified: false, responses }
  }

  // Check that quorum agrees on the result
  const resultStrings = successful.map(r => JSON.stringify(r.result))
  const resultCounts = new Map<string, number>()
  for (const rs of resultStrings) {
    resultCounts.set(rs, (resultCounts.get(rs) ?? 0) + 1)
  }

  const maxCount = Math.max(...resultCounts.values())
  return { verified: maxCount >= quorum, responses }
}

/**
 * Detect RPC manipulation by comparing responses
 */
export function detectRPCManipulation(responses: RPCResponseEntry[]): RPCManipulationResult {
  const successful = responses.filter(r => !r.error)

  if (successful.length < 2) {
    return { manipulated: false, divergentEndpoints: [] }
  }

  // Find the majority result
  const resultStrings = successful.map(r => ({ endpoint: r.endpoint, str: JSON.stringify(r.result) }))
  const counts = new Map<string, number>()
  for (const r of resultStrings) {
    counts.set(r.str, (counts.get(r.str) ?? 0) + 1)
  }

  let majorityResult = ''
  let majorityCount = 0
  for (const [result, count] of counts) {
    if (count > majorityCount) {
      majorityResult = result
      majorityCount = count
    }
  }

  const divergent = resultStrings
    .filter(r => r.str !== majorityResult)
    .map(r => r.endpoint)

  return {
    manipulated: divergent.length > 0,
    divergentEndpoints: divergent,
    details: divergent.length > 0
      ? `${divergent.length} of ${successful.length} endpoints returned different results`
      : undefined,
  }
}

/**
 * Check if an RPC endpoint is from a known trusted provider
 */
export function checkRPCEndpointTrust(endpoint: string): RPCTrustResult {
  const warnings: string[] = []

  try {
    const url = new URL(endpoint)

    // Check for HTTPS
    if (url.protocol !== 'https:') {
      warnings.push('Endpoint does not use HTTPS — data may be intercepted')
    }

    // Check against known trusted domains
    const isTrusted = KNOWN_TRUSTED_DOMAINS.some(domain =>
      url.hostname === domain || url.hostname.endsWith(`.${domain}`)
    )

    if (!isTrusted) {
      warnings.push(`Unknown RPC provider: ${url.hostname} — verify the endpoint is legitimate`)
    }

    // Check for localhost (acceptable for dev)
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
      warnings.push('Using localhost RPC — ensure this is a development environment')
    }

    return { trusted: isTrusted && warnings.length === 0, warnings }
  } catch {
    return {
      trusted: false,
      warnings: ['Invalid endpoint URL'],
    }
  }
}
