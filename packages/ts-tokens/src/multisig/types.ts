/**
 * Multi-Signature Types
 */

import type { PublicKey, Keypair } from '@solana/web3.js'

/**
 * Multi-sig account info
 */
export interface MultisigAccount {
  address: PublicKey
  m: number // Required signatures
  n: number // Total signers
  signers: PublicKey[]
  isInitialized: boolean
}

/**
 * Create multi-sig options
 */
export interface CreateMultisigOptions {
  signers: PublicKey[]
  threshold: number // m of n required
  payer?: PublicKey
}

/**
 * Multi-sig transaction
 */
export interface MultisigTransaction {
  id: string
  multisig: PublicKey
  instruction: Buffer
  signers: PublicKey[]
  signatures: Map<string, Buffer>
  executed: boolean
  createdAt: Date
  expiresAt?: Date
}

/**
 * Pending signature request
 */
export interface PendingSignature {
  transactionId: string
  multisig: PublicKey
  description: string
  requiredSignatures: number
  currentSignatures: number
  signers: Array<{
    address: PublicKey
    signed: boolean
  }>
  createdAt: Date
  expiresAt?: Date
}

/**
 * Sign transaction options
 */
export interface SignTransactionOptions {
  transactionId: string
  signer: Keypair
}

/**
 * Execute multi-sig transaction options
 */
export interface ExecuteMultisigOptions {
  transactionId: string
  payer: PublicKey
}

/**
 * Multi-sig proposal
 */
export interface MultisigProposal {
  id: string
  multisig: PublicKey
  proposer: PublicKey
  title: string
  description: string
  instructions: Buffer[]
  approvals: PublicKey[]
  rejections: PublicKey[]
  status: ProposalStatus
  createdAt: Date
  executedAt?: Date
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'

/**
 * Create proposal options
 */
export interface CreateProposalOptions {
  multisig: PublicKey
  title: string
  description: string
  instructions: Buffer[]
  expiresIn?: number // seconds
}

/**
 * Vote on proposal options
 */
export interface VoteOptions {
  proposalId: string
  approve: boolean
  signer: Keypair
}

/**
 * Multi-sig configuration for token operations
 */
export interface MultisigConfig {
  address: PublicKey
  threshold: number
  signers: PublicKey[]
}

/**
 * Multi-sig authority assignment
 */
export interface MultisigAuthorityAssignment {
  token: PublicKey
  authorityType: 'mint' | 'freeze' | 'update'
  multisig: PublicKey
}

// ---------------------------------------------------------------------------
// On-chain multisig program types (Phase 19)
// ---------------------------------------------------------------------------

/**
 * Result from multisig on-chain operations
 */
export interface MultisigResult {
  signature: string
  confirmed: boolean
  multisig?: string
  transaction?: string
  error?: string
}

/**
 * On-chain multisig account data
 */
export interface OnChainMultisig {
  address: PublicKey
  creator: PublicKey
  owners: PublicKey[]
  threshold: number
  nonce: bigint
  transactionCount: bigint
  createdAt: bigint
}

/**
 * On-chain multisig transaction data
 */
export interface OnChainTransaction {
  address: PublicKey
  multisig: PublicKey
  proposer: PublicKey
  instructionData: Buffer
  approvals: PublicKey[]
  rejections: PublicKey[]
  executed: boolean
  createdAt: bigint
  expiresAt?: bigint
}

/**
 * Options for adding an owner to a multisig
 */
export interface AddOwnerOptions {
  multisig: PublicKey
  newOwner: PublicKey
}

/**
 * Options for removing an owner from a multisig
 */
export interface RemoveOwnerOptions {
  multisig: PublicKey
  ownerToRemove: PublicKey
}

/**
 * Options for changing multisig threshold
 */
export interface ChangeThresholdOptions {
  multisig: PublicKey
  newThreshold: number
}

/**
 * Options for proposing a multisig transaction
 */
export interface ProposeTransactionOptions {
  multisig: PublicKey
  instructionData: Buffer
  expiresIn?: number // seconds from now
}

/**
 * Options for approve/reject/execute/cancel transaction actions
 */
export interface TransactionActionOptions {
  multisig: PublicKey
  transactionIndex: bigint
}

/**
 * Options for setting token authority to a multisig
 */
export interface SetTokenAuthorityMultisigOptions {
  mint: PublicKey
  authorityType: 'mint' | 'freeze'
  multisig: PublicKey
}

/**
 * Multisig transaction history entry
 */
export interface MultisigHistoryEntry {
  timestamp: bigint
  action: string
  signature: string
  actor: PublicKey
}
