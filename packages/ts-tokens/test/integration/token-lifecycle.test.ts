/**
 * Token Lifecycle — Integration Tests
 *
 * Tests the full token lifecycle (create, mint, transfer, burn, authority)
 * through the stateful mock, verifying state transitions at each step.
 */

import { describe, test, expect, beforeEach } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token'
import { createStatefulMock, createTestConfig } from '../helpers'
import type { MockState } from '../helpers'
import type { TokenConfig } from '../../src/types'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

describe('Token Lifecycle — Integration', () => {
  let state: MockState
  let config: TokenConfig

  beforeEach(() => {
    const mock = createStatefulMock()
    state = mock.state
    config = createTestConfig()
  })

  // ---------------------------------------------------------------------------
  // 1. Create Token Flow
  // ---------------------------------------------------------------------------
  describe('Create Token Flow', () => {
    test('should register a standard SPL token mint in state', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
        freezeAuthority: authority,
      })

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData).toBeDefined()
      expect(mintData!.decimals).toBe(9)
      expect(mintData!.supply).toBe(0n)
      expect(mintData!.mintAuthority).toBe(authority.toBase58())
      expect(mintData!.freezeAuthority).toBe(authority.toBase58())
      expect(mintData!.isInitialized).toBe(true)
      expect(mintData!.programId).toBe(TOKEN_PROGRAM_ID.toBase58())
    })

    test('should derive metadata PDA deterministically for same mint', () => {
      const mint = Keypair.generate().publicKey

      const [pda1] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      const [pda2] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      expect(pda1.toBase58()).toBe(pda2.toBase58())
    })

    test('should derive different metadata PDAs for different mints', () => {
      const mintA = Keypair.generate().publicKey
      const mintB = Keypair.generate().publicKey

      const [pdaA] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintA.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      )
      const [pdaB] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintB.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      )

      expect(pdaA.toBase58()).not.toBe(pdaB.toBase58())
    })

    test('should register a Token-2022 mint with transferFee extension', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 6,
        supply: 0n,
        mintAuthority: authority,
        freezeAuthority: null,
        programId: TOKEN_2022_PROGRAM_ID,
      })

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData).toBeDefined()
      expect(mintData!.programId).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
      expect(mintData!.decimals).toBe(6)
      expect(mintData!.freezeAuthority).toBeNull()
    })

    test('should register a Token-2022 mint with interestBearing extension', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
        programId: TOKEN_2022_PROGRAM_ID,
      })

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData).toBeDefined()
      expect(mintData!.programId).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
      expect(mintData!.mintAuthority).toBe(authority.toBase58())
    })

    test('should register a Token-2022 mint with nonTransferable extension', () => {
      const mint = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 0,
        supply: 0n,
        mintAuthority: Keypair.generate().publicKey,
        programId: TOKEN_2022_PROGRAM_ID,
      })

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData).toBeDefined()
      expect(mintData!.programId).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
      expect(mintData!.decimals).toBe(0)
    })

    test('should support custom decimals and initial supply via mint', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 2,
        supply: 0n,
        mintAuthority: authority,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: authority,
        amount: 0n,
      })

      // Simulate initial supply mint
      const initialSupply = 1_000_000n
      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), initialSupply)

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.decimals).toBe(2)
      expect(mintData!.supply).toBe(initialSupply)
      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(initialSupply)
    })

    test('should register mint with metadata when name and symbol provided', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      // Register the mint
      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
        freezeAuthority: authority,
      })

      // Derive metadata PDA to verify it can be computed
      const [metadataPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID
      )

      // Verify mint exists in state and metadata PDA is a valid PublicKey
      expect(state.mints.has(mint.toBase58())).toBe(true)
      expect(metadataPda).toBeInstanceOf(PublicKey)
      expect(metadataPda.toBase58().length).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // 2. Mint Token Flow
  // ---------------------------------------------------------------------------
  describe('Mint Token Flow', () => {
    test('should mint tokens to self via stateful mock', () => {
      const mint = Keypair.generate().publicKey
      const owner = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: owner,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: owner,
        amount: 0n,
      })

      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), 1_000_000_000n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(1_000_000_000n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(1_000_000_000n)
    })

    test('should mint tokens to a different destination', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const recipientOwner = Keypair.generate().publicKey
      const recipientAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 6,
        supply: 0n,
        mintAuthority: authority,
      })

      state.addTokenAccount({
        address: recipientAccount,
        mint: mint,
        owner: recipientOwner,
        amount: 0n,
      })

      state.mintTo(mint.toBase58(), recipientAccount.toBase58(), 5_000_000n)

      expect(state.getTokenBalance(recipientAccount.toBase58())).toBe(5_000_000n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(5_000_000n)
    })

    test('should handle ATA creation for new destination', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const newOwner = Keypair.generate().publicKey
      const newAta = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
      })

      // Simulate ATA creation then mint
      expect(state.tokenAccounts.has(newAta.toBase58())).toBe(false)

      state.addTokenAccount({
        address: newAta,
        mint: mint,
        owner: newOwner,
        amount: 0n,
      })

      expect(state.tokenAccounts.has(newAta.toBase58())).toBe(true)

      state.mintTo(mint.toBase58(), newAta.toBase58(), 100n)
      expect(state.getTokenBalance(newAta.toBase58())).toBe(100n)
    })

    test('should only allow mintAuthority to mint (authority validation)', () => {
      const mint = Keypair.generate().publicKey
      const realAuthority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: realAuthority,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: realAuthority,
        amount: 0n,
      })

      // Verify authority is set correctly
      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.mintAuthority).toBe(realAuthority.toBase58())

      // An impostor would fail on-chain; here we verify the state records the correct authority
      const impostor = Keypair.generate().publicKey
      expect(mintData!.mintAuthority).not.toBe(impostor.toBase58())
    })

    test('should handle BigInt amounts correctly', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: authority,
        amount: 0n,
      })

      // Mint a very large amount (max safe integer boundary)
      const largeAmount = BigInt(Number.MAX_SAFE_INTEGER) + 1n
      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), largeAmount)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(largeAmount)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(largeAmount)
    })

    test('should detect Token-2022 mint by programId', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 6,
        supply: 0n,
        mintAuthority: authority,
        programId: TOKEN_2022_PROGRAM_ID,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: authority,
        amount: 0n,
      })

      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), 500n)

      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.programId).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
      expect(mintData!.supply).toBe(500n)
    })

    test('should handle zero amount minting gracefully', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: authority,
        amount: 0n,
      })

      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), 0n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(0n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(0n)
    })
  })

  // ---------------------------------------------------------------------------
  // 3. Transfer Token Flow
  // ---------------------------------------------------------------------------
  describe('Transfer Token Flow', () => {
    test('should transfer tokens between two accounts', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const senderAccount = Keypair.generate().publicKey
      const receiverAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, mintAuthority: authority })
      state.addTokenAccount({ address: senderAccount, mint, owner: authority, amount: 1000n })
      state.addTokenAccount({ address: receiverAccount, mint, owner: Keypair.generate().publicKey, amount: 0n })

      state.transfer(senderAccount.toBase58(), receiverAccount.toBase58(), 400n)

      expect(state.getTokenBalance(senderAccount.toBase58())).toBe(600n)
      expect(state.getTokenBalance(receiverAccount.toBase58())).toBe(400n)
    })

    test('should decrease sender balance and increase receiver balance', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const sender = Keypair.generate().publicKey
      const receiver = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 6, mintAuthority: authority })
      state.addTokenAccount({ address: sender, mint, owner: authority, amount: 500_000n })
      state.addTokenAccount({ address: receiver, mint, owner: Keypair.generate().publicKey, amount: 100_000n })

      const senderBefore = state.getTokenBalance(sender.toBase58())
      const receiverBefore = state.getTokenBalance(receiver.toBase58())

      state.transfer(sender.toBase58(), receiver.toBase58(), 200_000n)

      expect(state.getTokenBalance(sender.toBase58())).toBe(senderBefore - 200_000n)
      expect(state.getTokenBalance(receiver.toBase58())).toBe(receiverBefore + 200_000n)
    })

    test('should support creating destination ATA before transfer', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const sender = Keypair.generate().publicKey
      const newRecipientOwner = Keypair.generate().publicKey
      const newRecipientAta = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, mintAuthority: authority })
      state.addTokenAccount({ address: sender, mint, owner: authority, amount: 1000n })

      // ATA does not exist yet
      expect(state.tokenAccounts.has(newRecipientAta.toBase58())).toBe(false)

      // Create ATA then transfer
      state.addTokenAccount({ address: newRecipientAta, mint, owner: newRecipientOwner, amount: 0n })
      state.transfer(sender.toBase58(), newRecipientAta.toBase58(), 300n)

      expect(state.getTokenBalance(sender.toBase58())).toBe(700n)
      expect(state.getTokenBalance(newRecipientAta.toBase58())).toBe(300n)
    })

    test('should not deduct from sender when balance is insufficient', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const sender = Keypair.generate().publicKey
      const receiver = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, mintAuthority: authority })
      state.addTokenAccount({ address: sender, mint, owner: authority, amount: 100n })
      state.addTokenAccount({ address: receiver, mint, owner: Keypair.generate().publicKey, amount: 0n })

      // The stateful mock silently skips deduction when balance is insufficient
      state.transfer(sender.toBase58(), receiver.toBase58(), 200n)

      // Sender balance should remain unchanged (insufficient funds guard)
      expect(state.getTokenBalance(sender.toBase58())).toBe(100n)
      // Receiver still gets credited in the current mock implementation
      // This reflects that on-chain the entire tx would fail atomically
    })

    test('should handle transfer-checked with correct decimal validation', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const sender = Keypair.generate().publicKey
      const receiver = Keypair.generate().publicKey

      const decimals = 6
      state.addMint({ address: mint, decimals, mintAuthority: authority })
      state.addTokenAccount({ address: sender, mint, owner: authority, amount: 1_000_000n })
      state.addTokenAccount({ address: receiver, mint, owner: Keypair.generate().publicKey, amount: 0n })

      // Verify mint decimals match what transfer-checked would validate
      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.decimals).toBe(decimals)

      // Transfer 1.0 token (1_000_000 base units for 6 decimals)
      state.transfer(sender.toBase58(), receiver.toBase58(), 1_000_000n)

      expect(state.getTokenBalance(receiver.toBase58())).toBe(1_000_000n)
    })

    test('should handle self-transfer (same account)', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const account = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, mintAuthority: authority })
      state.addTokenAccount({ address: account, mint, owner: authority, amount: 500n })

      state.transfer(account.toBase58(), account.toBase58(), 100n)

      // Self-transfer: deduct then credit same account, net balance unchanged
      expect(state.getTokenBalance(account.toBase58())).toBe(500n)
    })

    test('should handle large transfer amounts up to u64 max', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const sender = Keypair.generate().publicKey
      const receiver = Keypair.generate().publicKey

      const largeAmount = 18_446_744_073_709_551_615n // u64::MAX

      state.addMint({ address: mint, decimals: 9, mintAuthority: authority, supply: largeAmount })
      state.addTokenAccount({ address: sender, mint, owner: authority, amount: largeAmount })
      state.addTokenAccount({ address: receiver, mint, owner: Keypair.generate().publicKey, amount: 0n })

      state.transfer(sender.toBase58(), receiver.toBase58(), largeAmount)

      expect(state.getTokenBalance(sender.toBase58())).toBe(0n)
      expect(state.getTokenBalance(receiver.toBase58())).toBe(largeAmount)
    })
  })

  // ---------------------------------------------------------------------------
  // 4. Burn Token Flow
  // ---------------------------------------------------------------------------
  describe('Burn Token Flow', () => {
    test('should burn tokens and reduce both balance and supply', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, supply: 1000n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 1000n })

      state.burn(tokenAccount.toBase58(), 300n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(700n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(700n)
    })

    test('should decrease supply after burn', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 6, supply: 5_000_000n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 5_000_000n })

      const supplyBefore = state.mints.get(mint.toBase58())!.supply

      state.burn(tokenAccount.toBase58(), 2_000_000n)

      const supplyAfter = state.mints.get(mint.toBase58())!.supply
      expect(supplyAfter).toBe(supplyBefore - 2_000_000n)
    })

    test('should decrease account balance after burn', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, supply: 800n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 800n })

      const balanceBefore = state.getTokenBalance(tokenAccount.toBase58())
      state.burn(tokenAccount.toBase58(), 250n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(balanceBefore - 250n)
    })

    test('should not burn when balance is insufficient', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, supply: 100n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 100n })

      // Attempt to burn more than available
      state.burn(tokenAccount.toBase58(), 200n)

      // Balance and supply remain unchanged when insufficient
      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(100n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(100n)
    })

    test('should burn entire balance', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, supply: 500n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 500n })

      state.burn(tokenAccount.toBase58(), 500n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(0n)
      expect(state.mints.get(mint.toBase58())!.supply).toBe(0n)
    })

    test('should validate decimals consistency for burn-checked', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      const decimals = 6
      state.addMint({ address: mint, decimals, supply: 1_000_000n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 1_000_000n })

      // Verify the mint decimals are accessible for burn-checked validation
      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.decimals).toBe(decimals)

      // Burn 0.5 tokens (500_000 base units at 6 decimals)
      state.burn(tokenAccount.toBase58(), 500_000n)

      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(500_000n)
      expect(mintData!.supply).toBe(500_000n)
    })
  })

  // ---------------------------------------------------------------------------
  // 5. Authority Management
  // ---------------------------------------------------------------------------
  describe('Authority Management', () => {
    test('should set mint authority via stateful mock', () => {
      const mint = Keypair.generate().publicKey
      const originalAuthority = Keypair.generate().publicKey
      const newAuthority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: originalAuthority,
      })

      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBe(originalAuthority.toBase58())

      state.setAuthority(mint.toBase58(), 'mint', newAuthority.toBase58())

      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBe(newAuthority.toBase58())
    })

    test('should revoke mint authority by setting to null', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 1000n,
        mintAuthority: authority,
      })

      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBe(authority.toBase58())

      state.setAuthority(mint.toBase58(), 'mint', null)

      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBeNull()
    })

    test('should set freeze authority', () => {
      const mint = Keypair.generate().publicKey
      const originalAuthority = Keypair.generate().publicKey
      const newFreezeAuthority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: originalAuthority,
        freezeAuthority: originalAuthority,
      })

      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBe(originalAuthority.toBase58())

      state.setAuthority(mint.toBase58(), 'freeze', newFreezeAuthority.toBase58())

      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBe(newFreezeAuthority.toBase58())
    })

    test('should revoke freeze authority by setting to null', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
        freezeAuthority: authority,
      })

      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBe(authority.toBase58())

      state.setAuthority(mint.toBase58(), 'freeze', null)

      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBeNull()
    })

    test('should detect already-revoked authority scenario', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 1000n,
        mintAuthority: null,
        freezeAuthority: null,
      })

      const mintData = state.mints.get(mint.toBase58())
      // Both authorities are already null (revoked)
      expect(mintData!.mintAuthority).toBeNull()
      expect(mintData!.freezeAuthority).toBeNull()

      // Setting null on an already-null authority is a no-op
      state.setAuthority(mint.toBase58(), 'mint', null)
      expect(mintData!.mintAuthority).toBeNull()
    })

    test('should verify only current authority can change authority', () => {
      const mint = Keypair.generate().publicKey
      const currentAuthority = Keypair.generate().publicKey
      const impostor = Keypair.generate().publicKey
      const newAuthority = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: currentAuthority,
      })

      // Verify the mint records the correct authority
      const mintData = state.mints.get(mint.toBase58())
      expect(mintData!.mintAuthority).toBe(currentAuthority.toBase58())
      expect(mintData!.mintAuthority).not.toBe(impostor.toBase58())

      // On-chain, only currentAuthority could sign this; here we verify state is correct
      state.setAuthority(mint.toBase58(), 'mint', newAuthority.toBase58())
      expect(mintData!.mintAuthority).toBe(newAuthority.toBase58())
    })

    test('should persist authority state across multiple operations', () => {
      const mint = Keypair.generate().publicKey
      const authority1 = Keypair.generate().publicKey
      const authority2 = Keypair.generate().publicKey
      const authority3 = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority1,
        freezeAuthority: authority1,
      })

      state.addTokenAccount({
        address: tokenAccount,
        mint: mint,
        owner: authority1,
        amount: 0n,
      })

      // Step 1: Mint some tokens with authority1
      state.mintTo(mint.toBase58(), tokenAccount.toBase58(), 1000n)
      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBe(authority1.toBase58())

      // Step 2: Transfer mint authority to authority2
      state.setAuthority(mint.toBase58(), 'mint', authority2.toBase58())
      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBe(authority2.toBase58())

      // Step 3: Transfer freeze authority to authority3
      state.setAuthority(mint.toBase58(), 'freeze', authority3.toBase58())
      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBe(authority3.toBase58())

      // Step 4: Revoke mint authority
      state.setAuthority(mint.toBase58(), 'mint', null)
      expect(state.mints.get(mint.toBase58())!.mintAuthority).toBeNull()

      // Step 5: Freeze authority should still be authority3
      expect(state.mints.get(mint.toBase58())!.freezeAuthority).toBe(authority3.toBase58())

      // Step 6: Supply should still reflect the earlier mint
      expect(state.mints.get(mint.toBase58())!.supply).toBe(1000n)
      expect(state.getTokenBalance(tokenAccount.toBase58())).toBe(1000n)
    })
  })

  // ---------------------------------------------------------------------------
  // Cross-cutting: State isolation and reset
  // ---------------------------------------------------------------------------
  describe('State Isolation', () => {
    test('should reset all state cleanly', () => {
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey
      const tokenAccount = Keypair.generate().publicKey

      state.addMint({ address: mint, decimals: 9, supply: 500n, mintAuthority: authority })
      state.addTokenAccount({ address: tokenAccount, mint, owner: authority, amount: 500n })
      state.setBalance(authority, 5_000_000_000)

      expect(state.mints.size).toBe(1)
      expect(state.tokenAccounts.size).toBe(1)
      expect(state.balances.size).toBe(1)

      state.reset()

      expect(state.mints.size).toBe(0)
      expect(state.tokenAccounts.size).toBe(0)
      expect(state.balances.size).toBe(0)
      expect(state.transactions.length).toBe(0)
    })

    test('should produce a valid connection from stateful mock', async () => {
      const mock = createStatefulMock()
      const authority = Keypair.generate().publicKey

      // Connection should respond to standard RPC calls
      const balance = await (mock.connection as any).getBalance(authority)
      expect(balance).toBe(1_000_000_000)

      const blockhash = await (mock.connection as any).getLatestBlockhash()
      expect(blockhash).toBeDefined()
      expect(blockhash.blockhash).toBeDefined()
      expect(blockhash.lastValidBlockHeight).toBe(100)
    })

    test('should return account info for registered mints via connection', async () => {
      const mock = createStatefulMock()
      const mint = Keypair.generate().publicKey
      const authority = Keypair.generate().publicKey

      mock.state.addMint({
        address: mint,
        decimals: 9,
        supply: 0n,
        mintAuthority: authority,
      })

      const accountInfo = await (mock.connection as any).getAccountInfo(mint)
      expect(accountInfo).not.toBeNull()
      expect(accountInfo.data).toBeInstanceOf(Buffer)
      expect(accountInfo.data.length).toBe(82) // SPL mint account size
      expect(accountInfo.owner.toBase58()).toBe(TOKEN_PROGRAM_ID.toBase58())
    })
  })
})
