/**
 * pNFT Instruction Builders
 *
 * Raw TransactionInstruction builders for all pNFT operations.
 */

import type { TransactionInstruction } from '@solana/web3.js'
import { PublicKey, SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  PNFT_PROGRAM_ID,
  DISCRIMINATORS,
  serializeCreatePNFTData,
  serializeCreateRuleSetData,
  serializeCreateSoulboundData,
  serializeAddRuleData,
  serializeRemoveRuleData,
  serializeUpdateRuleData,
  serializeTransferPNFTData,
  serializeLockPNFTData,
} from './program'

const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111')

// ---------------------------------------------------------------------------
// Creation Instructions (3)
// ---------------------------------------------------------------------------

export function createCreatePNFTInstruction(
  payer: PublicKey,
  pnftAccount: PublicKey,
  mint: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  rulesData: Buffer
): TransactionInstruction {
  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeCreatePNFTData(name, symbol, uri, rulesData),
  }
}

export function createCreateRuleSetInstruction(
  authority: PublicKey,
  ruleSetAccount: PublicKey,
  collection: PublicKey,
  isMutable: boolean,
  rulesData: Buffer
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: ruleSetAccount, isSigner: false, isWritable: true },
      { pubkey: collection, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeCreateRuleSetData(isMutable, rulesData),
  }
}

export function createCreateSoulboundInstruction(
  payer: PublicKey,
  pnftAccount: PublicKey,
  mint: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  recoveryAuthority?: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeCreateSoulboundData(name, symbol, uri, recoveryAuthority),
  }
}

// ---------------------------------------------------------------------------
// Rule Management Instructions (4)
// ---------------------------------------------------------------------------

export function createAddRuleInstruction(
  authority: PublicKey,
  pnftAccount: PublicKey,
  ruleData: Buffer
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeAddRuleData(ruleData),
  }
}

export function createRemoveRuleInstruction(
  authority: PublicKey,
  pnftAccount: PublicKey,
  ruleTypeIndex: number
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeRemoveRuleData(ruleTypeIndex),
  }
}

export function createUpdateRuleInstruction(
  authority: PublicKey,
  pnftAccount: PublicKey,
  ruleData: Buffer
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeUpdateRuleData(ruleData),
  }
}

export function createFreezeRulesInstruction(
  authority: PublicKey,
  pnftAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: authority, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.freezeRules),
  }
}

// ---------------------------------------------------------------------------
// Transfer Instructions (3)
// ---------------------------------------------------------------------------

export function createTransferPNFTInstruction(
  owner: PublicKey,
  pnftAccount: PublicKey,
  mint: PublicKey,
  fromToken: PublicKey,
  toToken: PublicKey,
  destination: PublicKey,
  payRoyalty: boolean
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: fromToken, isSigner: false, isWritable: true },
      { pubkey: toToken, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeTransferPNFTData(payRoyalty),
  }
}

export function createDelegateTransferInstruction(
  owner: PublicKey,
  pnftAccount: PublicKey,
  delegate: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
      { pubkey: delegate, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.delegateTransfer),
  }
}

export function createRevokeDelegateInstruction(
  owner: PublicKey,
  pnftAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.revokeDelegate),
  }
}

// ---------------------------------------------------------------------------
// State Instructions (2)
// ---------------------------------------------------------------------------

export function createLockPNFTInstruction(
  owner: PublicKey,
  pnftAccount: PublicKey,
  state: 'listed' | 'staked'
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: serializeLockPNFTData(state),
  }
}

export function createUnlockPNFTInstruction(
  owner: PublicKey,
  pnftAccount: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: owner, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
    ],
    programId: PNFT_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.unlockPNFT),
  }
}

// ---------------------------------------------------------------------------
// Recovery Instructions (1)
// ---------------------------------------------------------------------------

export function createRecoverSoulboundInstruction(
  recoveryAuthority: PublicKey,
  pnftAccount: PublicKey,
  mint: PublicKey,
  fromToken: PublicKey,
  toToken: PublicKey,
  newOwner: PublicKey
): TransactionInstruction {
  return {
    keys: [
      { pubkey: recoveryAuthority, isSigner: true, isWritable: false },
      { pubkey: pnftAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: fromToken, isSigner: false, isWritable: true },
      { pubkey: toToken, isSigner: false, isWritable: true },
      { pubkey: newOwner, isSigner: false, isWritable: false },
    ],
    programId: PNFT_PROGRAM_ID,
    data: Buffer.from(DISCRIMINATORS.recoverSoulbound),
  }
}
