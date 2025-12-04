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
