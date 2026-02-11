/**
 * Emergency Procedures
 *
 * Emergency freeze, revoke, transfer, and incident response playbook generation.
 */

import type { Connection, Keypair } from '@solana/web3.js'
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js'

/**
 * Emergency action result
 */
export interface EmergencyResult {
  success: boolean
  signature?: string
  error?: string
}

/**
 * Incident response plan
 */
export interface IncidentResponsePlan {
  generatedAt: Date
  wallets: string[]
  tokens: string[]
  steps: Array<{
    priority: number
    action: string
    description: string
    command?: string
  }>
}

/**
 * Emergency freeze a token mint (requires freeze authority)
 */
export async function emergencyFreezeToken(
  connection: Connection,
  mint: string,
  authority: Keypair
): Promise<EmergencyResult> {
  try {
    const { createFreezeAccountInstruction, getAssociatedTokenAddress } = await import('@solana/spl-token')

    const mintPubkey = new PublicKey(mint)

    // Get all token accounts for this mint
    const accounts = await connection.getTokenLargestAccounts(mintPubkey)
    const transaction = new Transaction()

    for (const account of accounts.value) {
      if (account.uiAmount && account.uiAmount > 0) {
        transaction.add(
          createFreezeAccountInstruction(
            account.address,
            mintPubkey,
            authority.publicKey
          )
        )
      }
    }

    if (transaction.instructions.length === 0) {
      return { success: true, error: 'No accounts to freeze' }
    }

    const signature = await connection.sendTransaction(transaction, [authority])
    await connection.confirmTransaction(signature, 'confirmed')

    return { success: true, signature }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Emergency revoke mint or freeze authority
 */
export async function emergencyRevokeAuthority(
  connection: Connection,
  mint: string,
  authority: Keypair,
  authorityType: 'mint' | 'freeze'
): Promise<EmergencyResult> {
  try {
    const { AuthorityType, createSetAuthorityInstruction } = await import('@solana/spl-token')

    const mintPubkey = new PublicKey(mint)
    const authType = authorityType === 'mint' ? AuthorityType.MintTokens : AuthorityType.FreezeAccount

    const instruction = createSetAuthorityInstruction(
      mintPubkey,
      authority.publicKey,
      authType,
      null // Set to null to revoke
    )

    const transaction = new Transaction().add(instruction)
    const signature = await connection.sendTransaction(transaction, [authority])
    await connection.confirmTransaction(signature, 'confirmed')

    return { success: true, signature }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

/**
 * Emergency transfer all SOL and tokens to a safe wallet
 */
export async function emergencyTransferAll(
  connection: Connection,
  from: Keypair,
  to: string
): Promise<{ results: EmergencyResult[]; totalTransferred: number }> {
  const results: EmergencyResult[] = []
  const toPubkey = new PublicKey(to)
  let totalTransferred = 0

  try {
    // Transfer all SPL tokens first
    const { getAssociatedTokenAddress, createTransferInstruction, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID } = await import('@solana/spl-token')

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(from.publicKey, {
      programId: TOKEN_PROGRAM_ID,
    })

    for (const { account, pubkey } of tokenAccounts.value) {
      const parsed = account.data as any
      const info = parsed.parsed?.info
      if (!info || info.tokenAmount?.uiAmount === 0) continue

      try {
        const mint = new PublicKey(info.mint)
        const destAta = await getAssociatedTokenAddress(mint, toPubkey)

        const tx = new Transaction()

        // Create destination ATA if needed
        const destAccount = await connection.getAccountInfo(destAta)
        if (!destAccount) {
          tx.add(
            createAssociatedTokenAccountInstruction(
              from.publicKey,
              destAta,
              toPubkey,
              mint
            )
          )
        }

        tx.add(
          createTransferInstruction(
            pubkey,
            destAta,
            from.publicKey,
            BigInt(info.tokenAmount.amount)
          )
        )

        const sig = await connection.sendTransaction(tx, [from])
        await connection.confirmTransaction(sig, 'confirmed')
        results.push({ success: true, signature: sig })
        totalTransferred++
      } catch (err) {
        results.push({ success: false, error: `Token ${info.mint}: ${(err as Error).message}` })
      }
    }

    // Transfer remaining SOL (leave enough for rent)
    const balance = await connection.getBalance(from.publicKey)
    const rentExempt = 5000 // Minimum for transaction fee
    const solToSend = balance - rentExempt

    if (solToSend > 0) {
      const tx = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: from.publicKey,
          toPubkey,
          lamports: solToSend,
        })
      )

      const sig = await connection.sendTransaction(tx, [from])
      await connection.confirmTransaction(sig, 'confirmed')
      results.push({ success: true, signature: sig })
      totalTransferred++
    }
  } catch (err) {
    results.push({ success: false, error: (err as Error).message })
  }

  return { results, totalTransferred }
}

/**
 * Generate an incident response plan
 */
export function generateIncidentResponsePlan(
  wallets: string[],
  tokens: string[]
): IncidentResponsePlan {
  const steps: IncidentResponsePlan['steps'] = [
    {
      priority: 1,
      action: 'Revoke all token authorities',
      description: 'Immediately revoke mint and freeze authorities on all compromised tokens to prevent further minting or freezing.',
    },
    {
      priority: 2,
      action: 'Transfer assets to secure wallet',
      description: 'Move all remaining assets from compromised wallets to a new, secure wallet that has not been exposed.',
    },
    {
      priority: 3,
      action: 'Freeze affected token accounts',
      description: 'If you have freeze authority, freeze all token accounts that may be controlled by the attacker.',
    },
    {
      priority: 4,
      action: 'Document the incident',
      description: 'Record all known details: timestamps, transaction signatures, affected addresses, and estimated losses.',
    },
    {
      priority: 5,
      action: 'Notify stakeholders',
      description: 'Alert team members, users, and relevant parties about the security incident.',
    },
    {
      priority: 6,
      action: 'Analyze the attack vector',
      description: 'Investigate how the compromise occurred: phishing, key exposure, malicious dependency, etc.',
    },
    {
      priority: 7,
      action: 'Report to authorities',
      description: 'File reports with relevant law enforcement and blockchain security organizations if significant losses occurred.',
    },
    {
      priority: 8,
      action: 'Post-incident review',
      description: 'Conduct a thorough review, update security procedures, and implement additional safeguards.',
    },
  ]

  return {
    generatedAt: new Date(),
    wallets,
    tokens,
    steps,
  }
}
