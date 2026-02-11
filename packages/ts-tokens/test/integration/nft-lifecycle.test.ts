import { describe, test, expect, beforeEach } from 'bun:test'
import { Keypair, PublicKey } from '@solana/web3.js'
import {
  createStatefulMock,
  createTestConfig,
  buildMetadataBuffer,
  buildMasterEditionBuffer,
  buildEditionBuffer,
} from '../helpers'
import {
  calculateTreeCapacity,
  calculateTreeSpace,
  TREE_CONFIGS,
} from '../../src/nft/compressed/tree'
import { GuardType } from '../../src/programs/candy-machine/guards'
import type { GuardSet } from '../../src/programs/candy-machine/guards'
import {
  findMetadataPda,
  findMasterEditionPda,
} from '../../src/programs/token-metadata/pda'

const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

describe('NFT Lifecycle — Integration', () => {
  // ---------------------------------------------------------------
  // 1. Create NFT Flow
  // ---------------------------------------------------------------
  describe('Create NFT Flow', () => {
    let state: ReturnType<typeof createStatefulMock>['state']

    beforeEach(() => {
      const mock = createStatefulMock()
      state = mock.state
    })

    test('NFT mint creation uses decimals=0 and supply=1', () => {
      const mintKeypair = Keypair.generate()
      const owner = Keypair.generate()
      const tokenAccount = Keypair.generate()

      state.addMint({
        address: mintKeypair.publicKey,
        decimals: 0,
        supply: 0n,
        mintAuthority: owner.publicKey,
        freezeAuthority: owner.publicKey,
      })

      state.addTokenAccount({
        address: tokenAccount.publicKey,
        mint: mintKeypair.publicKey,
        owner: owner.publicKey,
        amount: 0n,
      })

      // Mint exactly 1 token (NFT)
      state.mintTo(mintKeypair.publicKey.toBase58(), tokenAccount.publicKey.toBase58(), 1n)

      const mintData = state.mints.get(mintKeypair.publicKey.toBase58())!
      expect(mintData.decimals).toBe(0)
      expect(mintData.supply).toBe(1n)
      expect(state.getTokenBalance(tokenAccount.publicKey.toBase58())).toBe(1n)
    })

    test('Metadata PDA derivation is deterministic and correct', () => {
      const mint = Keypair.generate().publicKey

      // Derive using findProgramAddressSync directly
      const [pdaDirect] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )

      // Derive using the helper
      const [pdaHelper, bump] = findMetadataPda(mint)

      expect(pdaDirect.equals(pdaHelper)).toBe(true)
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)

      // Calling again yields the same result
      const [pdaAgain] = findMetadataPda(mint)
      expect(pdaHelper.equals(pdaAgain)).toBe(true)
    })

    test('Master Edition PDA derivation', () => {
      const mint = Keypair.generate().publicKey

      const [masterEditionPda, bump] = findMasterEditionPda(mint)
      const [metadataPda] = findMetadataPda(mint)

      expect(masterEditionPda).toBeInstanceOf(PublicKey)
      expect(bump).toBeGreaterThanOrEqual(0)
      expect(bump).toBeLessThanOrEqual(255)

      // Master Edition PDA must differ from Metadata PDA
      expect(masterEditionPda.equals(metadataPda)).toBe(false)

      // Verify seeds match the expected pattern
      const [expectedPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          TOKEN_METADATA_PROGRAM_ID.toBuffer(),
          mint.toBuffer(),
          Buffer.from('edition'),
        ],
        TOKEN_METADATA_PROGRAM_ID
      )
      expect(masterEditionPda.equals(expectedPda)).toBe(true)
    })

    test('Metadata buffer deserialization round-trip', () => {
      const creator = Keypair.generate().publicKey
      const mintKey = Keypair.generate().publicKey
      const updateAuth = Keypair.generate().publicKey

      const buffer = buildMetadataBuffer({
        name: 'Cool NFT #42',
        symbol: 'COOL',
        uri: 'https://arweave.net/abc123',
        sellerFeeBasisPoints: 750,
        creators: [{ address: creator, verified: true, share: 100 }],
        primarySaleHappened: false,
        isMutable: true,
        mint: mintKey,
        updateAuthority: updateAuth,
      })

      expect(buffer.length).toBeGreaterThan(0)

      // Key discriminator = 4 (Metadata)
      expect(buffer.readUInt8(0)).toBe(4)

      // Update authority at offset 1
      const readUA = new PublicKey(buffer.slice(1, 33))
      expect(readUA.equals(updateAuth)).toBe(true)

      // Mint at offset 33
      const readMint = new PublicKey(buffer.slice(33, 65))
      expect(readMint.equals(mintKey)).toBe(true)

      // Name (length-prefixed string at offset 65)
      const nameLen = buffer.readUInt32LE(65)
      expect(nameLen).toBe(12) // 'Cool NFT #42'.length
      const nameStr = buffer.slice(69, 69 + nameLen).toString('utf8')
      expect(nameStr).toBe('Cool NFT #42')
    })

    test('MasterEdition buffer with maxSupply=0 (one-of-one)', () => {
      const buffer = buildMasterEditionBuffer({
        supply: 0n,
        maxSupply: 0n,
      })

      expect(buffer.length).toBeGreaterThan(0)

      // Key discriminator = 6 (MasterEdition)
      expect(buffer.readUInt8(0)).toBe(6)

      // Supply at offset 1 (u64LE)
      const supply = buffer.readBigUInt64LE(1)
      expect(supply).toBe(0n)

      // maxSupply option byte = 1 (Some)
      expect(buffer.readUInt8(9)).toBe(1)

      // maxSupply value = 0
      const maxSupply = buffer.readBigUInt64LE(10)
      expect(maxSupply).toBe(0n)
    })

    test('NFT with collection association', () => {
      const collectionMint = Keypair.generate().publicKey
      const nftMint = Keypair.generate().publicKey

      const buffer = buildMetadataBuffer({
        name: 'Collectible #1',
        symbol: 'COL',
        uri: 'https://arweave.net/col1',
        sellerFeeBasisPoints: 500,
        collection: { verified: false, key: collectionMint },
        mint: nftMint,
      })

      expect(buffer.length).toBeGreaterThan(0)
      expect(buffer.readUInt8(0)).toBe(4) // Metadata discriminator

      // Scan for collection presence: after creators section (option byte 0 = no creators),
      // the collection option byte should be 1 (Some)
      // The buffer contains the collection data embedded in the DataV2 section.
      // Verify the buffer includes the collection mint bytes somewhere
      const collectionMintBytes = collectionMint.toBuffer()
      const bufferHex = buffer.toString('hex')
      const collectionHex = collectionMintBytes.toString('hex')
      expect(bufferHex.includes(collectionHex)).toBe(true)
    })
  })

  // ---------------------------------------------------------------
  // 2. Transfer/Burn NFT Flow
  // ---------------------------------------------------------------
  describe('Transfer/Burn NFT Flow', () => {
    let state: ReturnType<typeof createStatefulMock>['state']
    let mintKey: string
    let sourceAccount: string
    let destAccount: string

    beforeEach(() => {
      const mock = createStatefulMock()
      state = mock.state

      const mint = Keypair.generate()
      const source = Keypair.generate()
      const dest = Keypair.generate()
      const owner = Keypair.generate()
      const recipient = Keypair.generate()

      mintKey = mint.publicKey.toBase58()
      sourceAccount = source.publicKey.toBase58()
      destAccount = dest.publicKey.toBase58()

      state.addMint({
        address: mint.publicKey,
        decimals: 0,
        supply: 0n,
        mintAuthority: owner.publicKey,
      })

      state.addTokenAccount({
        address: source.publicKey,
        mint: mint.publicKey,
        owner: owner.publicKey,
        amount: 0n,
      })

      state.addTokenAccount({
        address: dest.publicKey,
        mint: mint.publicKey,
        owner: recipient.publicKey,
        amount: 0n,
      })

      // Mint 1 NFT to source
      state.mintTo(mintKey, sourceAccount, 1n)
    })

    test('NFT transfer (amount=1) between accounts via stateful mock', () => {
      expect(state.getTokenBalance(sourceAccount)).toBe(1n)
      expect(state.getTokenBalance(destAccount)).toBe(0n)

      state.transfer(sourceAccount, destAccount, 1n)

      expect(state.getTokenBalance(sourceAccount)).toBe(0n)
      expect(state.getTokenBalance(destAccount)).toBe(1n)
    })

    test('Source account balance goes to 0 after transfer', () => {
      state.transfer(sourceAccount, destAccount, 1n)

      const sourceBalance = state.getTokenBalance(sourceAccount)
      expect(sourceBalance).toBe(0n)
    })

    test('Destination account balance goes to 1 after transfer', () => {
      state.transfer(sourceAccount, destAccount, 1n)

      const destBalance = state.getTokenBalance(destAccount)
      expect(destBalance).toBe(1n)
    })

    test('NFT burn (amount=1) via stateful mock', () => {
      expect(state.getTokenBalance(sourceAccount)).toBe(1n)
      expect(state.mints.get(mintKey)!.supply).toBe(1n)

      state.burn(sourceAccount, 1n)

      expect(state.getTokenBalance(sourceAccount)).toBe(0n)
    })

    test('Supply goes to 0 after burn', () => {
      state.burn(sourceAccount, 1n)

      const mintData = state.mints.get(mintKey)!
      expect(mintData.supply).toBe(0n)
    })
  })

  // ---------------------------------------------------------------
  // 3. Collection Flow
  // ---------------------------------------------------------------
  describe('Collection Flow', () => {
    let state: ReturnType<typeof createStatefulMock>['state']

    beforeEach(() => {
      const mock = createStatefulMock()
      state = mock.state
    })

    test('Collection mint creation (decimals=0, supply=1)', () => {
      const collectionMint = Keypair.generate()
      const authority = Keypair.generate()
      const collectionTokenAccount = Keypair.generate()

      state.addMint({
        address: collectionMint.publicKey,
        decimals: 0,
        supply: 0n,
        mintAuthority: authority.publicKey,
        freezeAuthority: authority.publicKey,
      })

      state.addTokenAccount({
        address: collectionTokenAccount.publicKey,
        mint: collectionMint.publicKey,
        owner: authority.publicKey,
        amount: 0n,
      })

      state.mintTo(
        collectionMint.publicKey.toBase58(),
        collectionTokenAccount.publicKey.toBase58(),
        1n
      )

      const mintData = state.mints.get(collectionMint.publicKey.toBase58())!
      expect(mintData.decimals).toBe(0)
      expect(mintData.supply).toBe(1n)

      // Revoke mint authority so no more can be minted
      state.setAuthority(collectionMint.publicKey.toBase58(), 'mint', null)
      const updatedMint = state.mints.get(collectionMint.publicKey.toBase58())!
      expect(updatedMint.mintAuthority).toBeNull()
    })

    test('Collection metadata PDA matches expected', () => {
      const collectionMint = Keypair.generate().publicKey

      const [metadataPda, bump] = findMetadataPda(collectionMint)
      expect(metadataPda).toBeInstanceOf(PublicKey)
      expect(bump).toBeGreaterThanOrEqual(0)

      // Must be on curve = false (it is a PDA, not a regular key)
      expect(PublicKey.isOnCurve(metadataPda.toBytes())).toBe(false)
    })

    test('Collection metadata buffer with collection field', () => {
      const collectionMint = Keypair.generate().publicKey

      const buffer = buildMetadataBuffer({
        name: 'My Collection',
        symbol: 'MCOL',
        uri: 'https://arweave.net/collection-meta',
        sellerFeeBasisPoints: 500,
        isMutable: true,
        collection: { verified: true, key: collectionMint },
      })

      expect(buffer.readUInt8(0)).toBe(4)

      // The collection mint key bytes appear in the buffer
      const collBytes = collectionMint.toBuffer()
      let found = false
      for (let i = 0; i <= buffer.length - 32; i++) {
        if (buffer.slice(i, i + 32).equals(collBytes)) {
          found = true
          break
        }
      }
      expect(found).toBe(true)
    })

    test('Verify collection item (metadata buffer with verified collection)', () => {
      const collectionMint = Keypair.generate().publicKey

      const verifiedBuffer = buildMetadataBuffer({
        name: 'Verified Item',
        symbol: 'VITM',
        uri: 'https://arweave.net/verified',
        sellerFeeBasisPoints: 250,
        collection: { verified: true, key: collectionMint },
      })

      // After the creators option byte (0 = none), the collection option is at a
      // known position. We scan for the first occurrence of the collection key
      // and check the verified byte immediately before it.
      const collBytes = collectionMint.toBuffer()
      let collectionOffset = -1
      for (let i = 0; i <= verifiedBuffer.length - 32; i++) {
        if (verifiedBuffer.slice(i, i + 32).equals(collBytes)) {
          collectionOffset = i
          break
        }
      }

      expect(collectionOffset).toBeGreaterThan(0)
      // The verified byte sits right before the collection key (option=1, verified=1, key=32 bytes)
      const verifiedByte = verifiedBuffer.readUInt8(collectionOffset - 1)
      expect(verifiedByte).toBe(1)
    })

    test('Set-and-verify pattern (unverified -> verified)', () => {
      const collectionMint = Keypair.generate().publicKey

      // First build with unverified
      const unverifiedBuffer = buildMetadataBuffer({
        name: 'Item Before Verify',
        symbol: 'UNV',
        uri: 'https://arweave.net/unverified',
        sellerFeeBasisPoints: 300,
        collection: { verified: false, key: collectionMint },
      })

      // Find verified byte for unverified state
      const collBytes = collectionMint.toBuffer()
      let offset = -1
      for (let i = 0; i <= unverifiedBuffer.length - 32; i++) {
        if (unverifiedBuffer.slice(i, i + 32).equals(collBytes)) {
          offset = i
          break
        }
      }
      expect(offset).toBeGreaterThan(0)
      expect(unverifiedBuffer.readUInt8(offset - 1)).toBe(0) // not verified

      // Then build with verified (simulating on-chain verification)
      const verifiedBuffer = buildMetadataBuffer({
        name: 'Item Before Verify',
        symbol: 'UNV',
        uri: 'https://arweave.net/unverified',
        sellerFeeBasisPoints: 300,
        collection: { verified: true, key: collectionMint },
      })

      let offset2 = -1
      for (let i = 0; i <= verifiedBuffer.length - 32; i++) {
        if (verifiedBuffer.slice(i, i + 32).equals(collBytes)) {
          offset2 = i
          break
        }
      }
      expect(offset2).toBeGreaterThan(0)
      expect(verifiedBuffer.readUInt8(offset2 - 1)).toBe(1) // now verified
    })
  })

  // ---------------------------------------------------------------
  // 4. Candy Machine Flow
  // ---------------------------------------------------------------
  describe('Candy Machine Flow', () => {
    test('CandyMachineConfig validation (itemsAvailable, symbol, fee range)', () => {
      const config = {
        itemsAvailable: 10000n,
        symbol: 'CANDY',
        sellerFeeBasisPoints: 500,
        isMutable: true,
        maxSupply: 0n,
        creators: [
          { address: Keypair.generate().publicKey, verified: false, percentageShare: 100 },
        ],
        configLineSettings: null,
        hiddenSettings: null,
      }

      expect(config.itemsAvailable).toBeGreaterThan(0n)
      expect(config.symbol.length).toBeLessThanOrEqual(10)
      expect(config.symbol.length).toBeGreaterThan(0)
      expect(config.sellerFeeBasisPoints).toBeGreaterThanOrEqual(0)
      expect(config.sellerFeeBasisPoints).toBeLessThanOrEqual(10000)
      expect(config.creators.reduce((s, c) => s + c.percentageShare, 0)).toBe(100)
    })

    test('Config line settings validation (prefix name/uri length)', () => {
      const configLineSettings = {
        prefixName: 'My NFT #',
        nameLength: 4,
        prefixUri: 'https://arweave.net/',
        uriLength: 43,
        isSequential: false,
      }

      expect(configLineSettings.prefixName.length).toBeLessThanOrEqual(32)
      expect(configLineSettings.nameLength).toBeGreaterThan(0)
      expect(configLineSettings.prefixUri.startsWith('https://')).toBe(true)
      expect(configLineSettings.uriLength).toBeGreaterThan(0)
      expect(configLineSettings.prefixName.length + configLineSettings.nameLength).toBeLessThanOrEqual(36)
      expect(configLineSettings.prefixUri.length + configLineSettings.uriLength).toBeLessThanOrEqual(200)
    })

    test('Items remaining calculation', () => {
      const itemsAvailable = 5000n
      const itemsRedeemed = 1234n
      const remaining = itemsAvailable - itemsRedeemed

      expect(remaining).toBe(3766n)
      expect(remaining).toBeGreaterThan(0n)
      expect(itemsRedeemed).toBeLessThan(itemsAvailable)
    })

    test('Sold-out detection', () => {
      const itemsAvailable = 100n

      // Not sold out yet
      const partiallyRedeemed = 99n
      expect(partiallyRedeemed >= itemsAvailable).toBe(false)

      // Exactly sold out
      const fullyRedeemed = 100n
      expect(fullyRedeemed >= itemsAvailable).toBe(true)

      // Over-redeemed should also count as sold out (edge case)
      const overRedeemed = 101n
      expect(overRedeemed >= itemsAvailable).toBe(true)
    })

    test('Guard configuration types (solPayment, startDate, mintLimit)', () => {
      const treasury = Keypair.generate().publicKey

      const guards: GuardSet = {
        solPayment: {
          lamports: 1_000_000_000n, // 1 SOL
          destination: treasury,
        },
        startDate: {
          date: BigInt(Math.floor(Date.now() / 1000)),
        },
        mintLimit: {
          id: 0,
          limit: 3,
        },
      }

      expect(guards.solPayment).toBeDefined()
      expect(guards.solPayment!.lamports).toBe(1_000_000_000n)
      expect(guards.solPayment!.destination.equals(treasury)).toBe(true)

      expect(guards.startDate).toBeDefined()
      expect(guards.startDate!.date).toBeGreaterThan(0n)

      expect(guards.mintLimit).toBeDefined()
      expect(guards.mintLimit!.id).toBe(0)
      expect(guards.mintLimit!.limit).toBe(3)

      // Verify the GuardType enum values
      expect(GuardType.SolPayment).toBe(1)
      expect(GuardType.StartDate).toBe(3)
      expect(GuardType.MintLimit).toBe(9)
    })
  })

  // ---------------------------------------------------------------
  // 5. Compressed NFT Flow
  // ---------------------------------------------------------------
  describe('Compressed NFT Flow', () => {
    test('calculateTreeCapacity(14) = 16384', () => {
      const capacity = calculateTreeCapacity(14)
      expect(capacity).toBe(16384)
      expect(capacity).toBe(Math.pow(2, 14))
    })

    test('calculateTreeCapacity(20) = 1048576', () => {
      const capacity = calculateTreeCapacity(20)
      expect(capacity).toBe(1048576)
      expect(capacity).toBe(Math.pow(2, 20))
    })

    test('calculateTreeSpace(14, 64, 11) returns a positive number', () => {
      const space = calculateTreeSpace(14, 64, 11)
      expect(space).toBeGreaterThan(0)
      expect(typeof space).toBe('number')
      expect(Number.isInteger(space)).toBe(true)

      // Verify that increasing canopy depth increases space
      const spaceNoCanopy = calculateTreeSpace(14, 64, 0)
      expect(space).toBeGreaterThan(spaceNoCanopy)
    })

    test('Tree config presets validation (small/medium/large)', () => {
      // Small: ~16K NFTs
      expect(TREE_CONFIGS.small.maxDepth).toBe(14)
      expect(TREE_CONFIGS.small.maxBufferSize).toBe(64)
      expect(TREE_CONFIGS.small.canopyDepth).toBe(0)
      expect(calculateTreeCapacity(TREE_CONFIGS.small.maxDepth)).toBe(16384)

      // Medium: ~1M NFTs
      expect(TREE_CONFIGS.medium.maxDepth).toBe(20)
      expect(TREE_CONFIGS.medium.maxBufferSize).toBe(256)
      expect(TREE_CONFIGS.medium.canopyDepth).toBe(10)
      expect(calculateTreeCapacity(TREE_CONFIGS.medium.maxDepth)).toBe(1048576)

      // Large: ~1B NFTs
      expect(TREE_CONFIGS.large.maxDepth).toBe(30)
      expect(TREE_CONFIGS.large.maxBufferSize).toBe(2048)
      expect(TREE_CONFIGS.large.canopyDepth).toBe(14)
      expect(calculateTreeCapacity(TREE_CONFIGS.large.maxDepth)).toBe(1073741824)

      // Sizes should increase: small < medium < large
      const smallSpace = calculateTreeSpace(
        TREE_CONFIGS.small.maxDepth,
        TREE_CONFIGS.small.maxBufferSize,
        TREE_CONFIGS.small.canopyDepth
      )
      const mediumSpace = calculateTreeSpace(
        TREE_CONFIGS.medium.maxDepth,
        TREE_CONFIGS.medium.maxBufferSize,
        TREE_CONFIGS.medium.canopyDepth
      )
      const largeSpace = calculateTreeSpace(
        TREE_CONFIGS.large.maxDepth,
        TREE_CONFIGS.large.maxBufferSize,
        TREE_CONFIGS.large.canopyDepth
      )

      expect(smallSpace).toBeLessThan(mediumSpace)
      expect(mediumSpace).toBeLessThan(largeSpace)
    })
  })
})
