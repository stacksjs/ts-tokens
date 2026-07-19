/**
 * SPL interface instruction discriminator tests
 *
 * Byte-exact assertions for the SPL Token-Metadata and Token-Group interface
 * discriminators, cross-checked against sha256 computed in the test itself.
 */

import { describe, test, expect } from 'bun:test'
import { createHash } from 'node:crypto'
import { Keypair } from '@solana/web3.js'
import {
  createInitializeTokenMetadataInstruction,
  createUpdateTokenMetadataFieldInstruction,
} from '../src/token/embedded-metadata'
import { createInitializeGroupInstruction } from '../src/token/token-group'

/** First 8 bytes of sha256(seed), as used by the SPL interface conventions. */
function interfaceDiscriminator(seed: string): Buffer {
  return createHash('sha256').update(seed).digest().subarray(0, 8)
}

describe('SPL Token-Metadata interface discriminators', () => {
  const mint = Keypair.generate().publicKey
  const authority = Keypair.generate().publicKey

  test('initialize = sha256("spl_token_metadata_interface:initialize")[0..8]', () => {
    // [53, 201, 129, 93, 171, 163, 190, 1]
    const expected = Buffer.from([53, 201, 129, 93, 171, 163, 190, 1])
    expect(interfaceDiscriminator('spl_token_metadata_interface:initialize')).toEqual(expected)

    const ix = createInitializeTokenMetadataInstruction(
      mint,
      authority,
      authority,
      'Name',
      'SYM',
      'https://example.com/m.json'
    )
    expect(ix.data.subarray(0, 8)).toEqual(expected)
  })

  test('update_field = sha256("spl_token_metadata_interface:update_field")[0..8]', () => {
    // [130, 68, 42, 109, 52, 18, 206, 255]
    const expected = Buffer.from([130, 68, 42, 109, 52, 18, 206, 255])
    expect(interfaceDiscriminator('spl_token_metadata_interface:update_field')).toEqual(expected)

    const ix = createUpdateTokenMetadataFieldInstruction(mint, authority, 'name', 'New Name')
    expect(ix.data.subarray(0, 8)).toEqual(expected)
  })
})

describe('SPL Token-Group interface discriminators', () => {
  test('initialize_group = sha256("spl_token_group_interface:initialize_group")[0..8]', () => {
    // [88, 13, 213, 85, 206, 182, 83, 46]
    const expected = Buffer.from([88, 13, 213, 85, 206, 182, 83, 46])
    expect(interfaceDiscriminator('spl_token_group_interface:initialize_group')).toEqual(expected)

    const group = Keypair.generate().publicKey
    const mint = Keypair.generate().publicKey
    const authority = Keypair.generate().publicKey
    const ix = createInitializeGroupInstruction(group, mint, authority, authority, 100)
    expect(ix.data.subarray(0, 8)).toEqual(expected)
  })
})
