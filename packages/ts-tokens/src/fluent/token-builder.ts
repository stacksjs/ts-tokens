/**
 * Token Builder
 *
 * Fluent API for token operations.
 */

import type { PublicKey, TransactionInstruction } from '@solana/web3.js'
import type {
  BurnParams,
  MintParams,
  TokenCreationParams,
  TransferParams,
} from './types'
import { BaseBuilder } from './builder'

/**
 * Fluent token builder
 *
 * @example
 * ```ts
 * const result = await TokenBuilder.create()
 *   .createToken({ name: 'MyToken', symbol: 'MTK', decimals: 9 })
 *   .mint({ amount: 1000000n })
 *   .transfer({ to: recipient, amount: 500000n })
 *   .withConnection(connection)
 *   .withPayer(payer)
 *   .execute()
 * ```
 */
export class TokenBuilder extends BaseBuilder<TokenBuilder> {
  private mintAddress: PublicKey | null = null

  /**
   * Create a new token builder
   */
  static create(): TokenBuilder {
    return new TokenBuilder()
  }

  /**
   * Create a new token
   */
  createToken(params: TokenCreationParams): TokenBuilder {
    return this.addOperation('createToken', {
      name: params.name,
      symbol: params.symbol,
      decimals: params.decimals ?? 9,
      initialSupply: params.initialSupply,
      mintAuthority: params.mintAuthority?.toBase58(),
      freezeAuthority: params.freezeAuthority?.toBase58(),
    })
  }

  /**
   * Use existing token
   */
  useToken(mint: PublicKey): TokenBuilder {
    this.mintAddress = mint
    return this.addOperation('useToken', { mint: mint.toBase58() })
  }

  /**
   * Mint tokens
   */
  mint(params: MintParams): TokenBuilder {
    return this.addOperation('mint', {
      amount: params.amount.toString(),
      to: params.to?.toBase58(),
    })
  }

  /**
   * Transfer tokens
   */
  transfer(params: TransferParams): TokenBuilder {
    return this.addOperation('transfer', {
      to: params.to.toBase58(),
      amount: params.amount.toString(),
    })
  }

  /**
   * Transfer to multiple recipients
   */
  transferToMany(recipients: Array<{ to: PublicKey, amount: bigint }>): TokenBuilder {
    return this.addOperation('transferToMany', {
      recipients: recipients.map(r => ({
        to: r.to.toBase58(),
        amount: r.amount.toString(),
      })),
    })
  }

  /**
   * Burn tokens
   */
  burn(params: BurnParams): TokenBuilder {
    return this.addOperation('burn', {
      amount: params.amount.toString(),
    })
  }

  /**
   * Freeze account
   */
  freeze(account: PublicKey): TokenBuilder {
    return this.addOperation('freeze', { account: account.toBase58() })
  }

  /**
   * Thaw account
   */
  thaw(account: PublicKey): TokenBuilder {
    return this.addOperation('thaw', { account: account.toBase58() })
  }

  /**
   * Set mint authority
   */
  setMintAuthority(newAuthority: PublicKey | null): TokenBuilder {
    return this.addOperation('setMintAuthority', {
      newAuthority: newAuthority?.toBase58() ?? null,
    })
  }

  /**
   * Set freeze authority
   */
  setFreezeAuthority(newAuthority: PublicKey | null): TokenBuilder {
    return this.addOperation('setFreezeAuthority', {
      newAuthority: newAuthority?.toBase58() ?? null,
    })
  }

  /**
   * Revoke mint authority
   */
  revokeMintAuthority(): TokenBuilder {
    return this.setMintAuthority(null)
  }

  /**
   * Revoke freeze authority
   */
  revokeFreezeAuthority(): TokenBuilder {
    return this.setFreezeAuthority(null)
  }

  /**
   * Close token account
   */
  closeAccount(account: PublicKey): TokenBuilder {
    return this.addOperation('closeAccount', { account: account.toBase58() })
  }

  /**
   * Build transaction instructions
   */
  async build(): Promise<TransactionInstruction[]> {
    const instructions: TransactionInstruction[] = []

    for (const op of this.operations) {
      // In production, would build actual instructions
      // This is a placeholder showing the structure
      switch (op.type) {
        case 'createToken':
          // Would call createToken instruction builder
          break
        case 'mint':
          // Would call mintTo instruction builder
          break
        case 'transfer':
          // Would call transfer instruction builder
          break
        case 'burn':
          // Would call burn instruction builder
          break
        // ... other operations
      }
    }

    return instructions
  }

  /**
   * Get current mint address
   */
  getMint(): PublicKey | null {
    return this.mintAddress
  }
}

/**
 * Create token builder shorthand
 */
export function tokens(): TokenBuilder {
  return TokenBuilder.create()
}
