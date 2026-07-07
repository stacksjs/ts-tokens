/**
 * Proposal Action Builders
 */

import { SystemProgram } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID as TOKEN_PROGRAM } from '@solana/spl-token'
import type { TreasuryActions, GovernanceActions, TokenActions } from '../types'
import { GOVERNANCE_PROGRAM_ID } from '../programs/program'
import { serializeUpdateDaoConfigData } from '../programs/program'

/**
 * Encode a u64 as 8 little-endian bytes. Uses writeBigUInt64LE so the byte
 * order is fixed regardless of host endianness (a raw BigUint64Array buffer is
 * platform-endian-dependent and would corrupt the amount on big-endian hosts).
 */
function u64le(value: bigint): Buffer {
  const buf = Buffer.alloc(8)
  buf.writeBigUInt64LE(value)
  return buf
}

export const treasuryActions: TreasuryActions = {
  transferSOL: (from, recipient, amount) => ({
    programId: SystemProgram.programId,
    accounts: [
      { pubkey: from, isSigner: true, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    // System Program Transfer: 4-byte u32 LE instruction index (2) + u64 LE lamports.
    data: Buffer.concat([Buffer.from([2, 0, 0, 0]), u64le(amount)]),
  }),

  // source/destination are SPL token accounts (ATAs); owner signs for source.
  transferToken: (source, destination, owner, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Transfer (3) + u64 LE amount.
    data: Buffer.concat([Buffer.from([3]), u64le(amount)]),
  }),

  // source/destination are SPL token accounts (ATAs); owner signs for source.
  transferNFT: (source, destination, owner) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Transfer (3) of exactly 1 token.
    data: Buffer.concat([Buffer.from([3]), u64le(1n)]),
  }),
}

export const governanceActions: GovernanceActions = {
  // Encodes the update via the program's real serializer. JSON.stringify is not
  // a valid instruction encoding and would additionally throw on the bigint
  // fields (votingPeriod/executionDelay). The DAO account meta is included so
  // the program can locate the account being updated.
  updateConfig: (newConfig, dao) => ({
    programId: GOVERNANCE_PROGRAM_ID,
    accounts: dao ? [{ pubkey: dao, isSigner: false, isWritable: true }] : [],
    data: serializeUpdateDaoConfigData(
      newConfig.votingPeriod ?? null,
      newConfig.quorum ?? null,
      newConfig.approvalThreshold ?? null,
      newConfig.executionDelay ?? null,
    ),
  }),

  addVetoAuthority: (authority) => ({
    programId: GOVERNANCE_PROGRAM_ID,
    accounts: [{ pubkey: authority, isSigner: false, isWritable: false }],
    data: Buffer.from([1]),
  }),

  removeVetoAuthority: () => ({
    programId: GOVERNANCE_PROGRAM_ID,
    accounts: [],
    data: Buffer.from([2]),
  }),
}

export const tokenActions: TokenActions = {
  // destination is the SPL token account (ATA) that receives minted tokens.
  mint: (mint, destination, mintAuthority, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: mintAuthority, isSigner: true, isWritable: false },
    ],
    // SPL Token MintTo (7) + u64 LE amount.
    data: Buffer.concat([Buffer.from([7]), u64le(amount)]),
  }),

  // tokenAccount holds the tokens being burned; owner signs for it.
  burn: (tokenAccount, mint, owner, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: tokenAccount, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    // SPL Token Burn (8) + u64 LE amount.
    data: Buffer.concat([Buffer.from([8]), u64le(amount)]),
  }),

  transferAuthority: (mint, currentAuthority, newAuthority) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: currentAuthority, isSigner: true, isWritable: false },
    ],
    // SPL Token SetAuthority (6): [instruction, authorityType (0=MintTokens),
    // newAuthority option (1=Some)] followed by the 32-byte new authority.
    data: Buffer.concat([Buffer.from([6, 0, 1]), newAuthority.toBuffer()]),
  }),
}
