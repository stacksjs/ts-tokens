/**
 * Orca Whirlpool Integration
 *
 * Concentrated liquidity pool interaction via Orca Whirlpools.
 */

import type { Connection } from '@solana/web3.js'
import { PublicKey, Transaction } from '@solana/web3.js'
import type { SwapOptions, SwapQuote, LiquidityPool } from './types'

const ORCA_WHIRLPOOL_API = 'https://api.mainnet.orca.so/v1'
const _ORCA_WHIRLPOOL_PROGRAM_ID = new PublicKey('whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc')

export interface WhirlpoolInfo {
  address: PublicKey
  tokenMintA: PublicKey
  tokenMintB: PublicKey
  tickSpacing: number
  liquidity: bigint
  sqrtPrice: bigint
  feeRate: number
  protocolFeeRate: number
}

export interface WhirlpoolPosition {
  address: PublicKey
  whirlpool: PublicKey
  tickLowerIndex: number
  tickUpperIndex: number
  liquidity: bigint
  feeOwedA: bigint
  feeOwedB: bigint
}

/**
 * Get whirlpool info
 */
export async function getWhirlpool(
  connection: Connection,
  whirlpoolAddress: PublicKey,
): Promise<WhirlpoolInfo> {
  const accountInfo = await connection.getAccountInfo(whirlpoolAddress)

  if (!accountInfo) {
    throw new Error(`Whirlpool not found: ${whirlpoolAddress.toBase58()}`)
  }

  const data = accountInfo.data

  // Orca Whirlpool account layout (little-endian):
  //   discriminator(8) @0, whirlpoolsConfig(32) @8, whirlpoolBump(1) @40,
  //   tickSpacing(u16) @41, tickSpacingSeed(2) @43, feeRate(u16) @45,
  //   protocolFeeRate(u16) @47, liquidity(u128) @49, sqrtPrice(u128) @65,
  //   tickCurrentIndex(i32) @81, protocolFeeOwedA/B(u64,u64) @85/@93,
  //   tokenMintA(32) @101, tokenVaultA(32) @133, feeGrowthGlobalA(u128) @165,
  //   tokenMintB(32) @181, ...
  const readU128LE = (off: number): bigint =>
    (data.readBigUInt64LE(off + 8) << 64n) | data.readBigUInt64LE(off)

  return {
    address: whirlpoolAddress,
    tokenMintA: new PublicKey(data.subarray(101, 133)),
    tokenMintB: new PublicKey(data.subarray(181, 213)),
    tickSpacing: data.readUInt16LE(41),
    liquidity: readU128LE(49),
    sqrtPrice: readU128LE(65),
    feeRate: data.readUInt16LE(45),
    protocolFeeRate: data.readUInt16LE(47),
  }
}

/**
 * Get swap quote from Orca
 */
export async function getOrcaSwapQuote(options: SwapOptions): Promise<SwapQuote> {
  const { inputMint, outputMint, amount, slippageBps = 50 } = options

  const params = new URLSearchParams({
    inputMint: inputMint.toBase58(),
    outputMint: outputMint.toBase58(),
    amount: amount.toString(),
    slippageBps: slippageBps.toString(),
  })

  const response = await fetch(`${ORCA_WHIRLPOOL_API}/quote/swap?${params}`)

  if (!response.ok) {
    throw new Error(`Orca API error: ${response.statusText}`)
  }

  const data = await response.json()

  return {
    inputMint,
    outputMint,
    inputAmount: BigInt(data.estimatedAmountIn ?? data.amount),
    outputAmount: BigInt(data.estimatedAmountOut ?? data.otherAmountThreshold),
    priceImpact: data.estimatedPriceImpact ?? 0,
    fee: BigInt(data.estimatedFeeAmount ?? 0),
    route: [{
      protocol: 'orca',
      inputMint,
      outputMint,
      inputAmount: BigInt(data.estimatedAmountIn ?? data.amount),
      outputAmount: BigInt(data.estimatedAmountOut ?? data.otherAmountThreshold),
      poolAddress: new PublicKey(data.whirlpool ?? PublicKey.default),
    }],
    expiresAt: Date.now() + 30000,
  }
}

/**
 * Get all whirlpools for a token pair
 */
export async function getWhirlpoolsForPair(
  tokenA: PublicKey,
  tokenB: PublicKey,
): Promise<Array<{ address: string; tickSpacing: number; liquidity: string; volume24h: number }>> {
  const response = await fetch(
    `${ORCA_WHIRLPOOL_API}/whirlpool/list?tokenA=${tokenA.toBase58()}&tokenB=${tokenB.toBase58()}`
  )

  if (!response.ok) {
    throw new Error(`Orca API error: ${response.statusText}`)
  }

  return response.json()
}

/**
 * Get positions for a wallet in Orca whirlpools
 */
export async function getOrcaPositions(
  _connection: Connection,
  owner: PublicKey,
): Promise<WhirlpoolPosition[]> {
  let response: Response
  try {
    response = await fetch(
      `${ORCA_WHIRLPOOL_API}/position/list?wallet=${owner.toBase58()}`
    )
  } catch (error) {
    // Network-level failure — surface it rather than masking an outage as
    // "no positions".
    throw new Error(
      `Failed to reach Orca API: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  // An HTTP failure is an outage, not an empty position list. Only a
  // successful response with zero positions may return [].
  if (!response.ok) {
    throw new Error(`Orca API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()

  return (data.positions ?? []).map((p: any) => ({
    address: new PublicKey(p.address),
    whirlpool: new PublicKey(p.whirlpool),
    tickLowerIndex: p.tickLowerIndex,
    tickUpperIndex: p.tickUpperIndex,
    liquidity: BigInt(p.liquidity ?? 0),
    feeOwedA: BigInt(p.feeOwedA ?? 0),
    feeOwedB: BigInt(p.feeOwedB ?? 0),
  }))
}
