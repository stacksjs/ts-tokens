/**
 * Candy Guard Types and Serializers
 *
 * All guard types for Candy Machine v3.
 */

import type { PublicKey } from '@solana/web3.js'

/**
 * Guard types enum
 */
export enum GuardType {
  BotTax = 0,
  SolPayment = 1,
  TokenPayment = 2,
  StartDate = 3,
  ThirdPartySigner = 4,
  TokenGate = 5,
  Gatekeeper = 6,
  EndDate = 7,
  AllowList = 8,
  MintLimit = 9,
  NftPayment = 10,
  RedeemedAmount = 11,
  AddressGate = 12,
  NftGate = 13,
  NftBurn = 14,
  TokenBurn = 15,
  FreezeSolPayment = 16,
  FreezeTokenPayment = 17,
  ProgramGate = 18,
  Allocation = 19,
  Token2022Payment = 20,
}

/**
 * Bot tax guard config
 */
export interface BotTaxGuard {
  lamports: bigint
  lastInstruction: boolean
}

/**
 * SOL payment guard config
 */
export interface SolPaymentGuard {
  lamports: bigint
  destination: PublicKey
}

/**
 * Token payment guard config
 */
export interface TokenPaymentGuard {
  amount: bigint
  mint: PublicKey
  destinationAta: PublicKey
}

/**
 * Start date guard config
 */
export interface StartDateGuard {
  date: bigint // Unix timestamp
}

/**
 * End date guard config
 */
export interface EndDateGuard {
  date: bigint // Unix timestamp
}

/**
 * Third party signer guard config
 */
export interface ThirdPartySignerGuard {
  signerKey: PublicKey
}

/**
 * Token gate guard config
 */
export interface TokenGateGuard {
  amount: bigint
  mint: PublicKey
}

/**
 * Gatekeeper guard config
 */
export interface GatekeeperGuard {
  gatekeeperNetwork: PublicKey
  expireOnUse: boolean
}

/**
 * Allow list guard config (Merkle root)
 */
export interface AllowListGuard {
  merkleRoot: Uint8Array // 32 bytes
}

/**
 * Mint limit guard config
 */
export interface MintLimitGuard {
  id: number
  limit: number
}

/**
 * NFT payment guard config
 */
export interface NftPaymentGuard {
  requiredCollection: PublicKey
  destination: PublicKey
}

/**
 * Redeemed amount guard config
 */
export interface RedeemedAmountGuard {
  maximum: bigint
}

/**
 * Address gate guard config
 */
export interface AddressGateGuard {
  address: PublicKey
}

/**
 * NFT gate guard config
 */
export interface NftGateGuard {
  requiredCollection: PublicKey
}

/**
 * NFT burn guard config
 */
export interface NftBurnGuard {
  requiredCollection: PublicKey
}

/**
 * Token burn guard config
 */
export interface TokenBurnGuard {
  amount: bigint
  mint: PublicKey
}

/**
 * Freeze SOL payment guard config
 */
export interface FreezeSolPaymentGuard {
  lamports: bigint
  destination: PublicKey
}

/**
 * Freeze token payment guard config
 */
export interface FreezeTokenPaymentGuard {
  amount: bigint
  mint: PublicKey
  destinationAta: PublicKey
}

/**
 * Program gate guard config
 */
export interface ProgramGateGuard {
  additional: PublicKey[]
}

/**
 * Allocation guard config
 */
export interface AllocationGuard {
  id: number
  limit: number
}

/**
 * Token 2022 payment guard config
 */
export interface Token2022PaymentGuard {
  amount: bigint
  mint: PublicKey
  destinationAta: PublicKey
}

/**
 * Complete guard set
 */
export interface GuardSet {
  botTax?: BotTaxGuard
  solPayment?: SolPaymentGuard
  tokenPayment?: TokenPaymentGuard
  startDate?: StartDateGuard
  thirdPartySigner?: ThirdPartySignerGuard
  tokenGate?: TokenGateGuard
  gatekeeper?: GatekeeperGuard
  endDate?: EndDateGuard
  allowList?: AllowListGuard
  mintLimit?: MintLimitGuard
  nftPayment?: NftPaymentGuard
  redeemedAmount?: RedeemedAmountGuard
  addressGate?: AddressGateGuard
  nftGate?: NftGateGuard
  nftBurn?: NftBurnGuard
  tokenBurn?: TokenBurnGuard
  freezeSolPayment?: FreezeSolPaymentGuard
  freezeTokenPayment?: FreezeTokenPaymentGuard
  programGate?: ProgramGateGuard
  allocation?: AllocationGuard
  token2022Payment?: Token2022PaymentGuard
}

/**
 * Serialize a guard set to buffer
 */
export function serializeGuardSet(guards: GuardSet): Buffer {
  const parts: Buffer[] = []

  // Features bitmap (which guards are enabled)
  let features = 0n
  if (guards.botTax)
    features |= 1n << BigInt(GuardType.BotTax)
  if (guards.solPayment)
    features |= 1n << BigInt(GuardType.SolPayment)
  if (guards.tokenPayment)
    features |= 1n << BigInt(GuardType.TokenPayment)
  if (guards.startDate)
    features |= 1n << BigInt(GuardType.StartDate)
  if (guards.thirdPartySigner)
    features |= 1n << BigInt(GuardType.ThirdPartySigner)
  if (guards.tokenGate)
    features |= 1n << BigInt(GuardType.TokenGate)
  if (guards.gatekeeper)
    features |= 1n << BigInt(GuardType.Gatekeeper)
  if (guards.endDate)
    features |= 1n << BigInt(GuardType.EndDate)
  if (guards.allowList)
    features |= 1n << BigInt(GuardType.AllowList)
  if (guards.mintLimit)
    features |= 1n << BigInt(GuardType.MintLimit)
  if (guards.nftPayment)
    features |= 1n << BigInt(GuardType.NftPayment)
  if (guards.redeemedAmount)
    features |= 1n << BigInt(GuardType.RedeemedAmount)
  if (guards.addressGate)
    features |= 1n << BigInt(GuardType.AddressGate)
  if (guards.nftGate)
    features |= 1n << BigInt(GuardType.NftGate)
  if (guards.nftBurn)
    features |= 1n << BigInt(GuardType.NftBurn)
  if (guards.tokenBurn)
    features |= 1n << BigInt(GuardType.TokenBurn)
  if (guards.freezeSolPayment)
    features |= 1n << BigInt(GuardType.FreezeSolPayment)
  if (guards.freezeTokenPayment)
    features |= 1n << BigInt(GuardType.FreezeTokenPayment)
  if (guards.programGate)
    features |= 1n << BigInt(GuardType.ProgramGate)
  if (guards.allocation)
    features |= 1n << BigInt(GuardType.Allocation)
  if (guards.token2022Payment)
    features |= 1n << BigInt(GuardType.Token2022Payment)

  const featuresBuffer = Buffer.alloc(8)
  featuresBuffer.writeBigUInt64LE(features)
  parts.push(featuresBuffer)

  // Serialize each enabled guard in order
  if (guards.botTax)
    parts.push(serializeBotTax(guards.botTax))
  if (guards.solPayment)
    parts.push(serializeSolPayment(guards.solPayment))
  if (guards.tokenPayment)
    parts.push(serializeTokenPayment(guards.tokenPayment))
  if (guards.startDate)
    parts.push(serializeStartDate(guards.startDate))
  if (guards.thirdPartySigner)
    parts.push(serializeThirdPartySigner(guards.thirdPartySigner))
  if (guards.tokenGate)
    parts.push(serializeTokenGate(guards.tokenGate))
  if (guards.gatekeeper)
    parts.push(serializeGatekeeper(guards.gatekeeper))
  if (guards.endDate)
    parts.push(serializeEndDate(guards.endDate))
  if (guards.allowList)
    parts.push(serializeAllowList(guards.allowList))
  if (guards.mintLimit)
    parts.push(serializeMintLimit(guards.mintLimit))
  if (guards.nftPayment)
    parts.push(serializeNftPayment(guards.nftPayment))
  if (guards.redeemedAmount)
    parts.push(serializeRedeemedAmount(guards.redeemedAmount))
  if (guards.addressGate)
    parts.push(serializeAddressGate(guards.addressGate))
  if (guards.nftGate)
    parts.push(serializeNftGate(guards.nftGate))
  if (guards.nftBurn)
    parts.push(serializeNftBurn(guards.nftBurn))
  if (guards.tokenBurn)
    parts.push(serializeTokenBurn(guards.tokenBurn))
  if (guards.freezeSolPayment)
    parts.push(serializeFreezeSolPayment(guards.freezeSolPayment))
  if (guards.freezeTokenPayment)
    parts.push(serializeFreezeTokenPayment(guards.freezeTokenPayment))
  if (guards.programGate)
    parts.push(serializeProgramGate(guards.programGate))
  if (guards.allocation)
    parts.push(serializeAllocation(guards.allocation))
  if (guards.token2022Payment)
    parts.push(serializeToken2022Payment(guards.token2022Payment))

  return Buffer.concat(parts)
}

// Individual guard serializers
function serializeBotTax(guard: BotTaxGuard): Buffer {
  const buffer = Buffer.alloc(9)
  buffer.writeBigUInt64LE(guard.lamports, 0)
  buffer.writeUInt8(guard.lastInstruction ? 1 : 0, 8)
  return buffer
}

function serializeSolPayment(guard: SolPaymentGuard): Buffer {
  const buffer = Buffer.alloc(40)
  buffer.writeBigUInt64LE(guard.lamports, 0)
  guard.destination.toBuffer().copy(buffer, 8)
  return buffer
}

function serializeTokenPayment(guard: TokenPaymentGuard): Buffer {
  const buffer = Buffer.alloc(72)
  buffer.writeBigUInt64LE(guard.amount, 0)
  guard.mint.toBuffer().copy(buffer, 8)
  guard.destinationAta.toBuffer().copy(buffer, 40)
  return buffer
}

function serializeStartDate(guard: StartDateGuard): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64LE(guard.date, 0)
  return buffer
}

function serializeEndDate(guard: EndDateGuard): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeBigInt64LE(guard.date, 0)
  return buffer
}

function serializeThirdPartySigner(guard: ThirdPartySignerGuard): Buffer {
  return guard.signerKey.toBuffer()
}

function serializeTokenGate(guard: TokenGateGuard): Buffer {
  const buffer = Buffer.alloc(40)
  buffer.writeBigUInt64LE(guard.amount, 0)
  guard.mint.toBuffer().copy(buffer, 8)
  return buffer
}

function serializeGatekeeper(guard: GatekeeperGuard): Buffer {
  const buffer = Buffer.alloc(33)
  guard.gatekeeperNetwork.toBuffer().copy(buffer, 0)
  buffer.writeUInt8(guard.expireOnUse ? 1 : 0, 32)
  return buffer
}

function serializeAllowList(guard: AllowListGuard): Buffer {
  return Buffer.from(guard.merkleRoot)
}

function serializeMintLimit(guard: MintLimitGuard): Buffer {
  const buffer = Buffer.alloc(3)
  buffer.writeUInt8(guard.id, 0)
  buffer.writeUInt16LE(guard.limit, 1)
  return buffer
}

function serializeNftPayment(guard: NftPaymentGuard): Buffer {
  const buffer = Buffer.alloc(64)
  guard.requiredCollection.toBuffer().copy(buffer, 0)
  guard.destination.toBuffer().copy(buffer, 32)
  return buffer
}

function serializeRedeemedAmount(guard: RedeemedAmountGuard): Buffer {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64LE(guard.maximum, 0)
  return buffer
}

function serializeAddressGate(guard: AddressGateGuard): Buffer {
  return guard.address.toBuffer()
}

function serializeNftGate(guard: NftGateGuard): Buffer {
  return guard.requiredCollection.toBuffer()
}

function serializeNftBurn(guard: NftBurnGuard): Buffer {
  return guard.requiredCollection.toBuffer()
}

function serializeTokenBurn(guard: TokenBurnGuard): Buffer {
  const buffer = Buffer.alloc(40)
  buffer.writeBigUInt64LE(guard.amount, 0)
  guard.mint.toBuffer().copy(buffer, 8)
  return buffer
}

function serializeFreezeSolPayment(guard: FreezeSolPaymentGuard): Buffer {
  const buffer = Buffer.alloc(40)
  buffer.writeBigUInt64LE(guard.lamports, 0)
  guard.destination.toBuffer().copy(buffer, 8)
  return buffer
}

function serializeFreezeTokenPayment(guard: FreezeTokenPaymentGuard): Buffer {
  const buffer = Buffer.alloc(72)
  buffer.writeBigUInt64LE(guard.amount, 0)
  guard.mint.toBuffer().copy(buffer, 8)
  guard.destinationAta.toBuffer().copy(buffer, 40)
  return buffer
}

function serializeProgramGate(guard: ProgramGateGuard): Buffer {
  const parts: Buffer[] = []
  const lenBuffer = Buffer.alloc(4)
  lenBuffer.writeUInt32LE(guard.additional.length)
  parts.push(lenBuffer)
  for (const pubkey of guard.additional) {
    parts.push(pubkey.toBuffer())
  }
  return Buffer.concat(parts)
}

function serializeAllocation(guard: AllocationGuard): Buffer {
  const buffer = Buffer.alloc(5)
  buffer.writeUInt8(guard.id, 0)
  buffer.writeUInt32LE(guard.limit, 1)
  return buffer
}

function serializeToken2022Payment(guard: Token2022PaymentGuard): Buffer {
  const buffer = Buffer.alloc(72)
  buffer.writeBigUInt64LE(guard.amount, 0)
  guard.mint.toBuffer().copy(buffer, 8)
  guard.destinationAta.toBuffer().copy(buffer, 40)
  return buffer
}
