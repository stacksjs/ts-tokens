/**
 * Proposal Action Builders
 */

import { PublicKey, SystemProgram } from '@solana/web3.js'
import type { TreasuryActions, GovernanceActions, TokenActions, DAOConfig } from '../types'
import { GOVERNANCE_PROGRAM_ID } from '../programs/program'

const TOKEN_PROGRAM = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')

export const treasuryActions: TreasuryActions = {
  transferSOL: (recipient, amount) => ({
    programId: SystemProgram.programId,
    accounts: [
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([2, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferToken: (mint, recipient, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([3, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferNFT: (mint, recipient) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([3, 1, 0, 0, 0, 0, 0, 0, 0]),
  }),
}

export const governanceActions: GovernanceActions = {
  updateConfig: (newConfig) => ({
    programId: GOVERNANCE_PROGRAM_ID,
    accounts: [],
    data: Buffer.from(JSON.stringify(newConfig)),
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
  mint: (mint, recipient, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: recipient, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([7, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  burn: (mint, amount) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([8, ...new Uint8Array(new BigUint64Array([amount]).buffer)]),
  }),

  transferAuthority: (mint, newAuthority) => ({
    programId: TOKEN_PROGRAM,
    accounts: [
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: newAuthority, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([6, 0]),
  }),
}
