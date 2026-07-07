import { describe, test, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import { Keypair, PublicKey } from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token'
import {
  initializeCandyMachine,
  mintFromCandyMachine,
} from '../src/programs/candy-machine/instructions'
import {
  initializeCandyGuard,
  updateCandyGuard,
  wrapCandyMachine,
  unwrapCandyMachine,
  mintWithGuard,
} from '../src/programs/candy-machine/guard-instructions'
import type { CandyMachineData } from '../src/programs/candy-machine/types'
import type { GuardSet } from '../src/programs/candy-machine/guards'

const CANDY_MACHINE_PROGRAM_ID = new PublicKey('CndyV3LdqHUfDLmE5naZjVN8rBZz4tqhdefbAnjHG3JR')
const CANDY_GUARD_PROGRAM_ID = new PublicKey('Guard1JwRhJkVH6XZhzoYxeBVQe872VH6QggF4BWmS9g')

/** Anchor discriminator: first 8 bytes of sha256('global:NAME'). */
function anchorDiscriminator(name: string): Buffer {
  return createHash('sha256').update(`global:${name}`).digest().subarray(0, 8)
}

function u32LE(value: number): Buffer {
  const b = Buffer.alloc(4)
  b.writeUInt32LE(value)
  return b
}

const key = () => Keypair.generate().publicKey

function sampleData(): CandyMachineData {
  return {
    itemsAvailable: 100n,
    symbol: 'TEST',
    sellerFeeBasisPoints: 500,
    maxSupply: 0n,
    isMutable: true,
    creators: [{ address: key(), verified: false, percentageShare: 100 }],
    configLineSettings: null,
    hiddenSettings: null,
  }
}

describe('initializeCandyMachine (initializeV2)', () => {
  const ix = initializeCandyMachine({
    candyMachine: key(),
    authority: key(),
    payer: key(),
    collectionMint: key(),
    collectionUpdateAuthority: key(),
    data: sampleData(),
    tokenStandard: 0,
  })

  test('uses the initialize_v2 discriminator [67,153,175,39,218,16,38,32]', () => {
    const expected = Buffer.from([67, 153, 175, 39, 218, 16, 38, 32])
    expect(anchorDiscriminator('initialize_v2')).toEqual(expected)
    expect(ix.data.subarray(0, 8)).toEqual(expected)
  })

  test('does NOT use the legacy initialize discriminator', () => {
    expect(ix.data.subarray(0, 8)).not.toEqual(anchorDiscriminator('initialize'))
  })

  test('serializes tokenStandard as the trailing byte', () => {
    expect(ix.data[ix.data.length - 1]).toBe(0)
  })

  test('has the initializeV2 account list in the IDL order', () => {
    // 13 required accounts + 2 optional pNFT auth-rules accounts.
    expect(ix.keys.length).toBe(15)

    // candyMachine (w), authorityPda (w), authority, payer (s,w)
    expect(ix.keys[0]).toMatchObject({ isSigner: false, isWritable: true })
    expect(ix.keys[1]).toMatchObject({ isSigner: false, isWritable: true })
    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: false })
    expect(ix.keys[3]).toMatchObject({ isSigner: true, isWritable: true })
    // collectionMetadata (w)
    expect(ix.keys[5]).toMatchObject({ isWritable: true })
    // collectionUpdateAuthority (s,w)
    expect(ix.keys[8]).toMatchObject({ isSigner: true, isWritable: true })
    // collectionDelegateRecord (w)
    expect(ix.keys[9]).toMatchObject({ isWritable: true })
    // tokenMetadataProgram (10) -> systemProgram (11) -> sysvarInstructions (12).
    // Per the mpl-candy-machine InitializeV2 IDL there is NO spl-token program
    // between tokenMetadataProgram and systemProgram.
    expect(ix.keys[11].pubkey.toBase58()).toBe('11111111111111111111111111111111')
    expect(ix.keys[12].pubkey.toBase58()).toBe('Sysvar1nstructions1111111111111111111111111')
    expect(ix.keys[11].pubkey.equals(TOKEN_PROGRAM_ID)).toBe(false)
  })

  test('does not include the rent sysvar', () => {
    const rent = 'SysvarRent111111111111111111111111111111111'
    expect(ix.keys.some(k => k.pubkey.toBase58() === rent)).toBe(false)
  })

  test('targets the candy machine program', () => {
    expect(ix.programId.equals(CANDY_MACHINE_PROGRAM_ID)).toBe(true)
  })
})

describe('mintFromCandyMachine (core mint)', () => {
  const ix = mintFromCandyMachine({
    candyMachine: key(),
    mintAuthority: key(),
    payer: key(),
    nftMint: key(),
    nftMintAuthority: key(),
    nftMetadata: key(),
    nftMasterEdition: key(),
    collectionAuthorityRecord: key(),
    collectionMint: key(),
    collectionMetadata: key(),
    collectionMasterEdition: key(),
    collectionUpdateAuthority: key(),
  })

  test('uses the mint discriminator and no args', () => {
    expect(ix.data).toEqual(anchorDiscriminator('mint'))
    expect(ix.data.length).toBe(8)
  })

  test('has the 17-account mint list in order', () => {
    expect(ix.keys.length).toBe(17)

    // candyMachine (w)
    expect(ix.keys[0]).toMatchObject({ isSigner: false, isWritable: true })
    // authorityPda (w)
    expect(ix.keys[1]).toMatchObject({ isSigner: false, isWritable: true })
    // mintAuthority (s)
    expect(ix.keys[2]).toMatchObject({ isSigner: true, isWritable: false })
    // payer (s,w)
    expect(ix.keys[3]).toMatchObject({ isSigner: true, isWritable: true })
    // nftMint (w) — defaults to signer so the program can create the account
    expect(ix.keys[4]).toMatchObject({ isWritable: true })
    // nftMintAuthority (s)
    expect(ix.keys[5]).toMatchObject({ isSigner: true, isWritable: false })
    // collectionAuthorityRecord present at index 8
    expect(ix.keys[8]).toMatchObject({ isSigner: false, isWritable: false })
    // programs and slothashes
    expect(ix.keys[14].pubkey.equals(TOKEN_PROGRAM_ID)).toBe(true)
    expect(ix.keys[16].pubkey.toBase58()).toBe('SysvarS1otHashes111111111111111111111111111')
  })

  test('nftMintIsSigner=false matches the IDL non-signer flag', () => {
    const nonSigner = mintFromCandyMachine({
      candyMachine: key(),
      mintAuthority: key(),
      payer: key(),
      nftMint: key(),
      nftMintIsSigner: false,
      nftMintAuthority: key(),
      nftMetadata: key(),
      nftMasterEdition: key(),
      collectionAuthorityRecord: key(),
      collectionMint: key(),
      collectionMetadata: key(),
      collectionMasterEdition: key(),
      collectionUpdateAuthority: key(),
    })
    expect(nonSigner.keys[4]).toMatchObject({ isSigner: false, isWritable: true })
  })

  test('does not include the ATA program or a phantom token account', () => {
    expect(ix.keys.some(k => k.pubkey.equals(ASSOCIATED_TOKEN_PROGRAM_ID))).toBe(false)
  })
})

describe('candy guard data (Vec<u8> wrapping)', () => {
  const guards: GuardSet = {
    solPayment: { lamports: 1000n, destination: key() },
  }

  test('initialize wraps CandyGuardData in a u32 length prefix and appends group count', () => {
    const ix = initializeCandyGuard({ base: key(), authority: key(), payer: key(), guards })

    expect(ix.data.subarray(0, 8)).toEqual(
      Buffer.from([175, 175, 109, 31, 13, 152, 155, 237])
    )

    // After the discriminator: u32 payload length, then payload.
    const declaredLen = ix.data.readUInt32LE(8)
    const payload = ix.data.subarray(12)
    expect(payload.length).toBe(declaredLen)

    // Payload = serialized default guard set + u32 group count (0).
    // solPayment guard set = 8 (features) + 40 (guard) = 48 bytes, then +4 group count.
    expect(payload.length).toBe(48 + 4)
    // The trailing 4 bytes are the group counter, always written (== 0 here).
    expect(payload.readUInt32LE(payload.length - 4)).toBe(0)
  })

  test('update uses the same Vec<u8> + group-count layout', () => {
    const ix = updateCandyGuard({
      candyGuard: key(),
      authority: key(),
      payer: key(),
      guards,
    })
    const declaredLen = ix.data.readUInt32LE(8)
    const payload = ix.data.subarray(12)
    expect(payload.length).toBe(declaredLen)
    expect(payload.readUInt32LE(payload.length - 4)).toBe(0)
    // update must include the system program account
    expect(
      ix.keys.some(k => k.pubkey.toBase58() === '11111111111111111111111111111111')
    ).toBe(true)
  })

  test('groups use a fixed 6-byte zero-padded label', () => {
    const ix = initializeCandyGuard({
      base: key(),
      authority: key(),
      payer: key(),
      guards: {},
      groups: [{ label: 'VIP', guards: {} }],
    })

    const payload = ix.data.subarray(12)
    // Default guard set (empty) = 8-byte features bitmap.
    let offset = 8
    // Group count u32 == 1
    expect(payload.readUInt32LE(offset)).toBe(1)
    offset += 4
    // 6-byte fixed label, zero-padded: "VIP\0\0\0"
    const label = payload.subarray(offset, offset + 6)
    expect(label.length).toBe(6)
    expect(label.subarray(0, 3).toString('utf8')).toBe('VIP')
    expect(label[3]).toBe(0)
    expect(label[4]).toBe(0)
    expect(label[5]).toBe(0)
  })
})

describe('wrap / unwrap include the guard authority signer', () => {
  test('wrap has candyGuard, authority(s), candyMachine(w), program, cmAuthority(s)', () => {
    const ix = wrapCandyMachine({
      candyGuard: key(),
      authority: key(),
      candyMachine: key(),
      candyMachineAuthority: key(),
    })
    expect(ix.keys.length).toBe(5)
    expect(ix.keys[1]).toMatchObject({ isSigner: true, isWritable: false }) // authority
    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: true }) // candyMachine
    expect(ix.keys[3].pubkey.equals(CANDY_MACHINE_PROGRAM_ID)).toBe(true)
    expect(ix.keys[4]).toMatchObject({ isSigner: true }) // candyMachineAuthority
  })

  test('unwrap includes the guard authority signer', () => {
    const ix = unwrapCandyMachine({
      candyGuard: key(),
      candyGuardAuthority: key(),
      candyMachine: key(),
      candyMachineAuthority: key(),
    })
    expect(ix.keys.length).toBe(5)
    expect(ix.keys[1]).toMatchObject({ isSigner: true }) // candyGuardAuthority
    expect(ix.keys[3]).toMatchObject({ isSigner: true }) // candyMachineAuthority
  })
})

describe('mintWithGuard (mint_v2)', () => {
  const base = {
    candyGuard: key(),
    candyMachine: key(),
    candyMachineAuthorityPda: key(),
    payer: key(),
    minter: key(),
    nftMint: key(),
    nftMintAuthority: key(),
    nftMetadata: key(),
    nftMasterEdition: key(),
    nftTokenAccount: key(),
    collectionDelegateRecord: key(),
    collectionMint: key(),
    collectionMetadata: key(),
    collectionMasterEdition: key(),
    collectionUpdateAuthority: key(),
  }

  test('uses the mint_v2 discriminator [120,121,23,146,173,110,199,205]', () => {
    const ix = mintWithGuard(base)
    const expected = Buffer.from([120, 121, 23, 146, 173, 110, 199, 205])
    expect(anchorDiscriminator('mint_v2')).toEqual(expected)
    expect(ix.data.subarray(0, 8)).toEqual(expected)
  })

  test('serializes mintArgs (Vec<u8>) before the label Option', () => {
    const ix = mintWithGuard(base)
    // disc(8) + u32 mintArgs len(0) + None label(1) = 13 bytes
    expect(ix.data.length).toBe(8 + 4 + 1)
    expect(ix.data.readUInt32LE(8)).toBe(0) // empty mintArgs
    expect(ix.data[12]).toBe(0) // label = None
  })

  test('emits a length-prefixed Some(label) when a group is given', () => {
    const ix = mintWithGuard({ ...base, group: 'VIP' })
    // disc(8) + u32 mintArgs len(0) + Some(1) + u32 label len(4) + "VIP"(3)
    expect(ix.data.length).toBe(8 + 4 + 1 + 4 + 3)
    expect(ix.data[12]).toBe(1) // Some
    expect(ix.data.readUInt32LE(13)).toBe(3)
    expect(ix.data.subarray(17).toString('utf8')).toBe('VIP')
  })

  test('has the mint_v2 account order (metadata after mint, no phantom, includes sysvars)', () => {
    const ix = mintWithGuard(base)
    // 23 required accounts + 2 optional pNFT auth-rules accounts = 25.
    expect(ix.keys.length).toBe(25)

    // candyGuard, candyMachineProgram, candyMachine(w), authorityPda(w)
    expect(ix.keys[1].pubkey.equals(CANDY_MACHINE_PROGRAM_ID)).toBe(true)
    expect(ix.keys[2]).toMatchObject({ isSigner: false, isWritable: true })
    expect(ix.keys[3]).toMatchObject({ isSigner: false, isWritable: true })
    // payer(s,w), minter(s,w), nftMint(s,w), nftMintAuthority(s)
    expect(ix.keys[4]).toMatchObject({ isSigner: true, isWritable: true })
    expect(ix.keys[5]).toMatchObject({ isSigner: true, isWritable: true })
    expect(ix.keys[6]).toMatchObject({ isSigner: true, isWritable: true })
    expect(ix.keys[7]).toMatchObject({ isSigner: true, isWritable: false })
    // nftMetadata comes AFTER nftMint (index 8 = metadata, 6 = mint)
    expect(ix.keys[8].pubkey.equals(base.nftMetadata)).toBe(true)
    expect(ix.keys[6].pubkey.equals(base.nftMint)).toBe(true)
    // instructions sysvar present
    expect(
      ix.keys.some(k => k.pubkey.toBase58() === 'Sysvar1nstructions1111111111111111111111111')
    ).toBe(true)
    // recent slothashes present
    expect(
      ix.keys.some(k => k.pubkey.toBase58() === 'SysvarS1otHashes111111111111111111111111111')
    ).toBe(true)
  })

  test('appends guard remaining accounts', () => {
    const dest = key()
    const ix = mintWithGuard({
      ...base,
      remainingAccounts: [{ pubkey: dest, isSigner: false, isWritable: true }],
    })
    expect(ix.keys.length).toBe(26)
    expect(ix.keys[25].pubkey.equals(dest)).toBe(true)
  })

  test('targets the candy guard program', () => {
    expect(mintWithGuard(base).programId.equals(CANDY_GUARD_PROGRAM_ID)).toBe(true)
  })
})
