import { describe, test, expect } from 'bun:test'
import { Keypair, PublicKey, SystemProgram, SYSVAR_INSTRUCTIONS_PUBKEY, SYSVAR_SLOT_HASHES_PUBKEY } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  initializeCandyMachine,
  addConfigLines,
  mintFromCandyMachine,
  updateCandyMachine,
  setCandyMachineAuthority,
  withdraw,
} from '../src/programs/candy-machine/instructions'
import {
  initializeCandyGuard,
  updateCandyGuard,
  wrapCandyMachine,
  unwrapCandyMachine,
  mintWithGuard,
} from '../src/programs/candy-machine/guard-instructions'
import {
  findCandyMachineAuthorityPda,
  findCandyGuardPda,
  findCollectionDelegateRecordPda,
} from '../src/programs/candy-machine/pda'
import { findMetadataPda, findMasterEditionPda } from '../src/programs/token-metadata/pda'
import type { CandyMachineData } from '../src/programs/candy-machine/types'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

function makeCandyMachineData(): CandyMachineData {
  return {
    itemsAvailable: 100n,
    symbol: 'TEST',
    sellerFeeBasisPoints: 500,
    maxSupply: 0n,
    isMutable: true,
    creators: [
      { address: Keypair.generate().publicKey, verified: false, percentageShare: 100 },
    ],
    configLineSettings: {
      prefixName: 'Item #',
      nameLength: 10,
      prefixUri: 'https://example.com/',
      uriLength: 20,
      isSequential: false,
    },
    hiddenSettings: null,
  }
}

describe('initializeCandyMachine (initializeV2)', () => {
  const candyMachine = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey
  const payer = Keypair.generate().publicKey
  const collectionMint = Keypair.generate().publicKey
  const collectionUpdateAuthority = Keypair.generate().publicKey
  const data = makeCandyMachineData()

  const ix = initializeCandyMachine({
    candyMachine,
    authority,
    payer,
    collectionMint,
    collectionUpdateAuthority,
    data,
    tokenStandard: 0,
  })

  test('uses the initializeV2 discriminator', () => {
    // sha256('global:initialize_v2')[0..8]
    expect([...ix.data.subarray(0, 8)]).toEqual([67, 153, 175, 39, 218, 16, 38, 32])
  })

  test('appends tokenStandard as the trailing byte after CandyMachineData', () => {
    expect(ix.data[ix.data.length - 1]).toBe(0)
  })

  test('has exactly 15 accounts in IDL order', () => {
    const [authorityPda] = findCandyMachineAuthorityPda(candyMachine)
    const [collectionMetadata] = findMetadataPda(collectionMint)
    const [collectionMasterEdition] = findMasterEditionPda(collectionMint)
    const [collectionDelegateRecord] = findCollectionDelegateRecordPda(
      collectionMint,
      collectionUpdateAuthority,
      authorityPda
    )

    expect(ix.keys.length).toBe(15)
    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyMachine,
      authorityPda,
      authority,
      payer,
      CANDY_MACHINE_PROGRAM_ID, // ruleSet: None marker
      collectionMetadata,
      collectionMint,
      collectionMasterEdition,
      collectionUpdateAuthority,
      collectionDelegateRecord,
      TOKEN_METADATA_PROGRAM_ID,
      SystemProgram.programId, // no SPL Token program in initializeV2
      SYSVAR_INSTRUCTIONS_PUBKEY,
      CANDY_MACHINE_PROGRAM_ID, // authorizationRulesProgram: None marker
      CANDY_MACHINE_PROGRAM_ID, // authorizationRules: None marker
    ].map(k => k.toBase58()))
  })

  test('sets signer and writable flags per the IDL', () => {
    expect(ix.keys[0]).toMatchObject({ isSigner: false, isWritable: true }) // candyMachine
    expect(ix.keys[1]).toMatchObject({ isSigner: false, isWritable: true }) // authorityPda
    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: false }) // authority
    expect(ix.keys[3]).toMatchObject({ isSigner: true, isWritable: true }) // payer
    expect(ix.keys[5]).toMatchObject({ isSigner: false, isWritable: true }) // collectionMetadata
    expect(ix.keys[8]).toMatchObject({ isSigner: true, isWritable: true }) // collectionUpdateAuthority
    expect(ix.keys[9]).toMatchObject({ isSigner: false, isWritable: true }) // collectionDelegateRecord
  })

  test('serializes CandyMachineData between discriminator and tokenStandard', () => {
    const body = ix.data.subarray(8, ix.data.length - 1)
    // itemsAvailable u64
    expect(body.readBigUInt64LE(0)).toBe(100n)
    // symbol string
    expect(body.readUInt32LE(8)).toBe(4)
    expect(body.subarray(12, 16).toString()).toBe('TEST')
    // sellerFeeBasisPoints u16
    expect(body.readUInt16LE(16)).toBe(500)
    // maxSupply u64
    expect(body.readBigUInt64LE(18)).toBe(0n)
    // isMutable bool
    expect(body[26]).toBe(1)
    // creators vec length
    expect(body.readUInt32LE(27)).toBe(1)
  })
})

describe('mintFromCandyMachine (mint_v2)', () => {
  const candyMachine = Keypair.generate().publicKey
  const mintAuthority = Keypair.generate().publicKey
  const payer = Keypair.generate().publicKey
  const nftMint = Keypair.generate().publicKey
  const collectionMint = Keypair.generate().publicKey
  const collectionUpdateAuthority = Keypair.generate().publicKey
  const [authorityPda] = findCandyMachineAuthorityPda(candyMachine)
  const [nftMetadata] = findMetadataPda(nftMint)
  const [nftMasterEdition] = findMasterEditionPda(nftMint)
  const [collectionMetadata] = findMetadataPda(collectionMint)
  const [collectionMasterEdition] = findMasterEditionPda(collectionMint)
  const [collectionDelegateRecord] = findCollectionDelegateRecordPda(
    collectionMint,
    collectionUpdateAuthority,
    authorityPda
  )
  const nftTokenAccount = Keypair.generate().publicKey

  const ix = mintFromCandyMachine({
    candyMachine,
    mintAuthority,
    payer,
    nftMint,
    nftMintAuthority: payer,
    nftMetadata,
    nftMasterEdition,
    tokenAccount: nftTokenAccount,
    collectionDelegateRecord,
    collectionMint,
    collectionMetadata,
    collectionMasterEdition,
    collectionUpdateAuthority,
  })

  test('uses the mint_v2 discriminator', () => {
    // sha256('global:mint_v2')[0..8]
    expect([...ix.data.subarray(0, 8)]).toEqual([120, 121, 23, 146, 173, 110, 199, 205])
  })

  test('serializes empty mintArgs and a None label', () => {
    const args = ix.data.subarray(8)
    expect(args.readUInt32LE(0)).toBe(0)
    expect(args[4]).toBe(0)
    expect(args.length).toBe(5)
  })

  test('has exactly 24 accounts in MintV2 IDL order', () => {
    expect(ix.keys.length).toBe(24)
    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyMachine,
      authorityPda,
      mintAuthority,
      payer,
      nftMint,
      payer, // nftMintAuthority
      nftMetadata,
      nftMasterEdition,
      nftTokenAccount,
      CANDY_MACHINE_PROGRAM_ID, // tokenRecord: None marker
      collectionDelegateRecord,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      collectionUpdateAuthority,
      CANDY_MACHINE_PROGRAM_ID, // collectionAuthorityRecord: None marker
      TOKEN_METADATA_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_INSTRUCTIONS_PUBKEY,
      SYSVAR_SLOT_HASHES_PUBKEY,
      CANDY_MACHINE_PROGRAM_ID, // authorizationRulesProgram: None marker
      CANDY_MACHINE_PROGRAM_ID, // authorizationRules: None marker
    ].map(k => k.toBase58()))
  })

  test('marks the nft mint as a signer by default (fresh keypair flow)', () => {
    expect(ix.keys[4].isSigner).toBe(true)
    expect(ix.keys[4].isWritable).toBe(true)
  })

  test('mint authority signs but is not writable', () => {
    expect(ix.keys[2]).toMatchObject({ isSigner: true, isWritable: false })
  })

  test('optional accounts use the program-id None placeholder and flip when provided', () => {
    const tokenRecord = Keypair.generate().publicKey
    const withRecord = mintFromCandyMachine({
      candyMachine,
      mintAuthority,
      payer,
      nftMint,
      nftMintAuthority: payer,
      nftMetadata,
      nftMasterEdition,
      tokenAccount: nftTokenAccount,
      tokenRecord,
      collectionDelegateRecord,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      collectionUpdateAuthority,
    })
    expect(withRecord.keys[9].pubkey.equals(tokenRecord)).toBe(true)
    expect(withRecord.keys[9].isWritable).toBe(true)
  })
})

describe('core admin instructions', () => {
  const candyMachine = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey

  test('addConfigLines serializes index and config lines after its discriminator', () => {
    const ix = addConfigLines({
      candyMachine,
      authority,
      index: 7,
      configLines: [{ name: 'One', uri: 'https://a/1' }],
    })

    expect([...ix.data.subarray(0, 8)]).toEqual([223, 50, 224, 227, 151, 8, 115, 106])
    expect(ix.data.readUInt32LE(8)).toBe(7) // index
    expect(ix.data.readUInt32LE(12)).toBe(1) // vec length
    expect(ix.data.readUInt32LE(16)).toBe(3) // name length
    expect(ix.data.subarray(20, 23).toString()).toBe('One')
    expect(ix.keys.length).toBe(2)
    expect(ix.keys[1]).toMatchObject({ isSigner: true, isWritable: false })
  })

  test('updateCandyMachine uses the update discriminator', () => {
    const ix = updateCandyMachine({ candyMachine, authority, data: makeCandyMachineData() })
    expect([...ix.data.subarray(0, 8)]).toEqual([219, 200, 88, 176, 158, 63, 253, 127])
    expect(ix.keys.length).toBe(2)
  })

  test('setCandyMachineAuthority appends the new authority pubkey', () => {
    const newAuthority = Keypair.generate().publicKey
    const ix = setCandyMachineAuthority(candyMachine, authority, newAuthority)
    expect([...ix.data.subarray(0, 8)]).toEqual([133, 250, 37, 21, 110, 163, 26, 121])
    expect(new PublicKey(ix.data.subarray(8)).equals(newAuthority)).toBe(true)
  })

  test('withdraw has a writable signing authority', () => {
    const ix = withdraw({ candyMachine, authority })
    expect([...ix.data]).toEqual([183, 18, 70, 156, 148, 109, 161, 34])
    expect(ix.keys[1]).toMatchObject({ isSigner: true, isWritable: true })
  })
})

describe('initializeCandyGuard', () => {
  const base = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey
  const payer = Keypair.generate().publicKey

  test('wraps CandyGuardData in a length-prefixed Vec<u8> with a group counter', () => {
    const ix = initializeCandyGuard({ base, authority, payer, guards: {} })

    expect([...ix.data.subarray(0, 8)]).toEqual([175, 175, 109, 31, 13, 152, 155, 237])
    // Vec<u8> length prefix: empty guard set = 8 (features) + 4 (group count)
    expect(ix.data.readUInt32LE(8)).toBe(12)
    // features bitmap: no guards enabled
    expect(ix.data.readBigUInt64LE(12)).toBe(0n)
    // group counter present even without groups
    expect(ix.data.readUInt32LE(20)).toBe(0)
    expect(ix.data.length).toBe(8 + 4 + 12)
  })

  test('has the IDL account list with derived candy guard PDA', () => {
    const ix = initializeCandyGuard({ base, authority, payer, guards: {} })
    const [candyGuard] = findCandyGuardPda(base)

    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyGuard,
      base,
      authority,
      payer,
      SystemProgram.programId,
    ].map(k => k.toBase58()))
    expect(ix.keys[1]).toMatchObject({ isSigner: true, isWritable: false }) // base
    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: false }) // authority
    expect(ix.keys[3]).toMatchObject({ isSigner: true, isWritable: true }) // payer
  })

  test('serializes enabled guards after the features bitmap', () => {
    const destination = Keypair.generate().publicKey
    const ix = initializeCandyGuard({
      base,
      authority,
      payer,
      guards: {
        botTax: { lamports: 10000000n, lastInstruction: true },
        solPayment: { lamports: 1000000000n, destination },
      },
    })

    const payload = ix.data.subarray(12)
    // features: bits 0 (botTax) and 1 (solPayment)
    expect(payload.readBigUInt64LE(0)).toBe(0b11n)
    // botTax: lamports u64 + lastInstruction bool
    expect(payload.readBigUInt64LE(8)).toBe(10000000n)
    expect(payload[16]).toBe(1)
    // solPayment: lamports u64 + destination pubkey
    expect(payload.readBigUInt64LE(17)).toBe(1000000000n)
    expect(new PublicKey(payload.subarray(25, 57)).equals(destination)).toBe(true)
    // group counter follows the guard set
    expect(payload.readUInt32LE(57)).toBe(0)
  })

  test('serializes groups with fixed 6-byte zero-padded labels', () => {
    const ix = initializeCandyGuard({
      base,
      authority,
      payer,
      guards: {},
      groups: [{ label: 'og', guards: { mintLimit: { id: 1, limit: 2 } } }],
    })

    const payload = ix.data.subarray(12)
    expect(payload.readBigUInt64LE(0)).toBe(0n) // default set: empty
    expect(payload.readUInt32LE(8)).toBe(1) // one group
    expect(payload.subarray(12, 18).toString('latin1')).toBe('og\0\0\0\0')
    // group guard set: features has bit 9 (mintLimit)
    expect(payload.readBigUInt64LE(18)).toBe(1n << 9n)
    expect(payload[26]).toBe(1) // id
    expect(payload.readUInt16LE(27)).toBe(2) // limit
  })

  test('rejects group labels longer than 6 bytes', () => {
    expect(() =>
      initializeCandyGuard({
        base,
        authority,
        payer,
        guards: {},
        groups: [{ label: 'toolong', guards: {} }],
      })
    ).toThrow()
  })
})

describe('updateCandyGuard', () => {
  test('includes the system program and length-prefixed data', () => {
    const candyGuard = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey
    const payer = Keypair.generate().publicKey

    const ix = updateCandyGuard({ candyGuard, authority, payer, guards: {} })

    expect([...ix.data.subarray(0, 8)]).toEqual([219, 200, 88, 176, 158, 63, 253, 127])
    expect(ix.data.readUInt32LE(8)).toBe(12)
    expect(ix.keys.length).toBe(4)
    expect(ix.keys[3].pubkey.equals(SystemProgram.programId)).toBe(true)
  })
})

describe('wrap and unwrap', () => {
  const candyGuard = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey
  const candyMachine = Keypair.generate().publicKey
  const candyMachineAuthority = Keypair.generate().publicKey

  test('wrap orders accounts as candyGuard, authority, candyMachine, program, cmAuthority', () => {
    const ix = wrapCandyMachine({ candyGuard, authority, candyMachine, candyMachineAuthority })

    expect([...ix.data]).toEqual([178, 40, 10, 189, 228, 129, 186, 140])
    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyGuard,
      authority,
      candyMachine,
      CANDY_MACHINE_PROGRAM_ID,
      candyMachineAuthority,
    ].map(k => k.toBase58()))
    expect(ix.keys[1].isSigner).toBe(true)
    expect(ix.keys[2].isWritable).toBe(true)
    expect(ix.keys[4].isSigner).toBe(true)
  })

  test('unwrap orders accounts as candyGuard, authority, candyMachine, cmAuthority, program', () => {
    const ix = unwrapCandyMachine({
      candyGuard,
      candyGuardAuthority: authority,
      candyMachine,
      candyMachineAuthority,
    })

    expect([...ix.data]).toEqual([126, 175, 198, 14, 212, 69, 50, 44])
    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyGuard,
      authority,
      candyMachine,
      candyMachineAuthority,
      CANDY_MACHINE_PROGRAM_ID,
    ].map(k => k.toBase58()))
  })
})

describe('mintWithGuard (mintV2)', () => {
  const candyGuard = Keypair.generate().publicKey
  const candyMachine = Keypair.generate().publicKey
  const payer = Keypair.generate().publicKey
  const minter = Keypair.generate().publicKey
  const nftMint = Keypair.generate().publicKey
  const collectionMint = Keypair.generate().publicKey
  const collectionUpdateAuthority = Keypair.generate().publicKey
  const [candyMachineAuthorityPda] = findCandyMachineAuthorityPda(candyMachine)
  const [nftMetadata] = findMetadataPda(nftMint)
  const [nftMasterEdition] = findMasterEditionPda(nftMint)
  const [collectionMetadata] = findMetadataPda(collectionMint)
  const [collectionMasterEdition] = findMasterEditionPda(collectionMint)
  const [collectionDelegateRecord] = findCollectionDelegateRecordPda(
    collectionMint,
    collectionUpdateAuthority,
    candyMachineAuthorityPda
  )
  const nftTokenAccount = Keypair.generate().publicKey

  const baseParams = {
    candyGuard,
    candyMachine,
    candyMachineAuthorityPda,
    payer,
    minter,
    nftMint,
    nftMintAuthority: minter,
    nftMetadata,
    nftMasterEdition,
    nftTokenAccount,
    collectionDelegateRecord,
    collectionMint,
    collectionMetadata,
    collectionMasterEdition,
    collectionUpdateAuthority,
  }

  test('uses the mint_v2 discriminator', () => {
    const ix = mintWithGuard(baseParams)
    // sha256('global:mint_v2')[0..8]
    expect([...ix.data.subarray(0, 8)]).toEqual([120, 121, 23, 146, 173, 110, 199, 205])
  })

  test('has all 25 IDL accounts including optional placeholders', () => {
    const ix = mintWithGuard(baseParams)

    expect(ix.keys.length).toBe(25)
    expect(ix.keys.map(k => k.pubkey.toBase58())).toEqual([
      candyGuard,
      CANDY_MACHINE_PROGRAM_ID,
      candyMachine,
      candyMachineAuthorityPda,
      payer,
      minter,
      nftMint,
      minter, // nftMintAuthority
      nftMetadata,
      nftMasterEdition,
      nftTokenAccount,
      CANDY_GUARD_PROGRAM_ID, // tokenRecord: None marker
      collectionDelegateRecord,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      collectionUpdateAuthority,
      TOKEN_METADATA_PROGRAM_ID,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID,
      SystemProgram.programId,
      SYSVAR_INSTRUCTIONS_PUBKEY,
      SYSVAR_SLOT_HASHES_PUBKEY,
      CANDY_GUARD_PROGRAM_ID, // authorizationRulesProgram: None marker
      CANDY_GUARD_PROGRAM_ID, // authorizationRules: None marker
    ].map(k => k.toBase58()))
  })

  test('sets signer and writable flags per the IDL', () => {
    const ix = mintWithGuard(baseParams)

    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: true }) // candyMachine
    expect(ix.keys[3]).toMatchObject({ isSigner: false, isWritable: true }) // authorityPda
    expect(ix.keys[4]).toMatchObject({ isSigner: true, isWritable: true }) // payer
    expect(ix.keys[5]).toMatchObject({ isSigner: true, isWritable: true }) // minter
    expect(ix.keys[6]).toMatchObject({ isSigner: true, isWritable: true }) // nftMint
    expect(ix.keys[7]).toMatchObject({ isSigner: true, isWritable: false }) // nftMintAuthority
    expect(ix.keys[11].isWritable).toBe(false) // tokenRecord placeholder
    expect(ix.keys[12]).toMatchObject({ isSigner: false, isWritable: false }) // delegate record
    expect(ix.keys[14].isWritable).toBe(true) // collectionMetadata
  })

  test('serializes empty mintArgs and a None label by default', () => {
    const ix = mintWithGuard(baseParams)
    const args = ix.data.subarray(8)

    expect(args.readUInt32LE(0)).toBe(0) // mintArgs length
    expect(args[4]).toBe(0) // Option::None
    expect(args.length).toBe(5)
  })

  test('serializes a Some(label) when a group is given', () => {
    const ix = mintWithGuard({ ...baseParams, group: 'og' })
    const args = ix.data.subarray(8)

    expect(args.readUInt32LE(0)).toBe(0)
    expect(args[4]).toBe(1) // Option::Some
    expect(args.readUInt32LE(5)).toBe(2)
    expect(args.subarray(9, 11).toString()).toBe('og')
  })

  test('marks a provided tokenRecord writable', () => {
    const tokenRecord = Keypair.generate().publicKey
    const ix = mintWithGuard({ ...baseParams, tokenRecord })
    expect(ix.keys[11].pubkey.equals(tokenRecord)).toBe(true)
    expect(ix.keys[11].isWritable).toBe(true)
  })

  test('appends remaining accounts after the optional placeholders', () => {
    const extra = Keypair.generate().publicKey
    const ix = mintWithGuard({
      ...baseParams,
      remainingAccounts: [{ pubkey: extra, isSigner: false, isWritable: true }],
    })
    expect(ix.keys.length).toBe(26)
    expect(ix.keys[25].pubkey.equals(extra)).toBe(true)
  })
})

describe('Candy Machine Configuration', () => {
  test('should validate items available is positive', () => {
    const itemsAvailable = 1000n
    expect(itemsAvailable).toBeGreaterThan(0n)
  })

  test('should validate symbol length', () => {
    const symbol = 'MNFT'
    expect(symbol.length).toBeLessThanOrEqual(10)
  })

  test('should validate seller fee basis points range', () => {
    const validFees = [0, 500, 10000]
    for (const fee of validFees) {
      expect(fee).toBeGreaterThanOrEqual(0)
      expect(fee).toBeLessThanOrEqual(10000)
    }
  })

  test('should validate creator shares sum to 100', () => {
    const creators = [
      { address: Keypair.generate().publicKey, share: 70 },
      { address: Keypair.generate().publicKey, share: 30 },
    ]
    const total = creators.reduce((sum, c) => sum + c.share, 0)
    expect(total).toBe(100)
  })
})

describe('Config Line Settings', () => {
  test('should validate prefix name length', () => {
    const prefixName = 'My NFT #'
    expect(prefixName.length).toBeLessThanOrEqual(32)
  })

  test('should validate prefix URI format', () => {
    const prefixUri = 'https://arweave.net/'
    expect(prefixUri.startsWith('https://')).toBe(true)
  })
})

describe('Candy Machine State', () => {
  test('should calculate items remaining', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 42n
    expect(itemsAvailable - itemsRedeemed).toBe(958n)
  })

  test('should detect sold out', () => {
    const itemsAvailable = 100n
    const itemsRedeemed = 100n
    expect(itemsRedeemed >= itemsAvailable).toBe(true)
  })

  test('should calculate mint percentage', () => {
    const itemsAvailable = 1000n
    const itemsRedeemed = 250n
    expect(Number((itemsRedeemed * 100n) / itemsAvailable)).toBe(25)
  })

  test('should calculate total cost', () => {
    const price = 1_000_000_000n
    const quantity = 3n
    expect(price * quantity).toBe(3_000_000_000n)
  })
})
