/**
 * MPL Core Instructions
 *
 * Raw instruction builders for the MPL Core program.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from '@solana/web3.js'
import {
  MPL_CORE_PROGRAM_ID,
  MplCoreInstruction,
  serializeString,
  serializeU8,
  serializeU16,
  serializeU32,
  serializeOption,
  getPluginTypeDiscriminator,
  AuthorityType,
  RuleSetType,
  UpdateAuthorityType,
} from './types'
import type { CorePlugin, CorePluginAuthority, RuleSet } from '../../types/core'

const PROGRAM_ID = new PublicKey(MPL_CORE_PROGRAM_ID)

/**
 * Serialize a plugin authority
 */
function serializeAuthority(authority: CorePluginAuthority): Buffer {
  switch (authority.type) {
    case 'Owner':
      return serializeU8(AuthorityType.Owner)
    case 'UpdateAuthority':
      return serializeU8(AuthorityType.UpdateAuthority)
    case 'Address':
      return Buffer.concat([serializeU8(AuthorityType.Address), new PublicKey(authority.address).toBuffer()])
    case 'None':
      return serializeU8(AuthorityType.None)
  }
}

/**
 * Serialize a rule set
 */
function serializeRuleSet(ruleSet: RuleSet): Buffer {
  switch (ruleSet.type) {
    case 'None':
      return serializeU8(RuleSetType.None)
    case 'ProgramAllowList':
      return Buffer.concat([
        serializeU8(RuleSetType.ProgramAllowList),
        serializeU32(ruleSet.programs.length),
        ...ruleSet.programs.map(p => new PublicKey(p).toBuffer()),
      ])
    case 'ProgramDenyList':
      return Buffer.concat([
        serializeU8(RuleSetType.ProgramDenyList),
        serializeU32(ruleSet.programs.length),
        ...ruleSet.programs.map(p => new PublicKey(p).toBuffer()),
      ])
  }
}

/**
 * Serialize a plugin for instruction data
 */
function serializePlugin(plugin: CorePlugin): Buffer {
  const typeDisc = getPluginTypeDiscriminator(plugin.type)
  const typeBuffer = serializeU8(typeDisc)

  switch (plugin.type) {
    case 'Royalties':
      return Buffer.concat([
        typeBuffer,
        serializeU16(plugin.basisPoints),
        serializeU32(plugin.creators.length),
        ...plugin.creators.map(c => Buffer.concat([
          new PublicKey(c.address).toBuffer(),
          serializeU8(c.percentage),
        ])),
        serializeRuleSet(plugin.ruleSet),
      ])
    case 'FreezeDelegate':
      return Buffer.concat([typeBuffer, serializeU8(plugin.frozen ? 1 : 0)])
    case 'TransferDelegate':
    case 'BurnDelegate':
    case 'AddBlocker':
    case 'ImmutableMetadata':
      return typeBuffer
    case 'PermanentFreezeDelegate':
      return Buffer.concat([typeBuffer, serializeU8(plugin.frozen ? 1 : 0)])
    case 'PermanentTransferDelegate':
    case 'PermanentBurnDelegate':
      return typeBuffer
    case 'UpdateDelegate':
      return typeBuffer
    case 'Attributes':
      return Buffer.concat([
        typeBuffer,
        serializeU32(plugin.attributeList.length),
        ...plugin.attributeList.map(a => Buffer.concat([
          serializeString(a.key),
          serializeString(a.value),
        ])),
      ])
    case 'Edition':
      return Buffer.concat([typeBuffer, serializeU32(plugin.number)])
    case 'MasterEdition':
      return Buffer.concat([
        typeBuffer,
        serializeOption(plugin.maxSupply, v => serializeU32(v)),
        serializeOption(plugin.name, serializeString),
        serializeOption(plugin.uri, serializeString),
      ])
    case 'Autograph':
      return Buffer.concat([
        typeBuffer,
        serializeU32(plugin.signatures.length),
        ...plugin.signatures.map(s => Buffer.concat([
          new PublicKey(s.address).toBuffer(),
          serializeString(s.message),
        ])),
      ])
    case 'VerifiedCreators':
      return Buffer.concat([
        typeBuffer,
        serializeU32(plugin.signatures.length),
        ...plugin.signatures.map(s => Buffer.concat([
          new PublicKey(s.address).toBuffer(),
          serializeU8(s.verified ? 1 : 0),
        ])),
      ])
    case 'AppData':
      return Buffer.concat([
        typeBuffer,
        serializeString(JSON.stringify(plugin.data)),
      ])
    default:
      return typeBuffer
  }
}

/**
 * Serialize plugins list for instruction data
 */
function serializePluginsList(plugins: CorePlugin[]): Buffer {
  if (plugins.length === 0) {
    return Buffer.from([0]) // None option
  }
  return Buffer.concat([
    Buffer.from([1]), // Some option
    serializeU32(plugins.length),
    ...plugins.map(p => {
      const authority = ('authority' in p && p.authority)
        ? serializeAuthority(p.authority as CorePluginAuthority)
        : serializeU8(AuthorityType.UpdateAuthority)
      return Buffer.concat([authority, serializePlugin(p)])
    }),
  ])
}

/**
 * Create a Core asset (createV2)
 */
export function createV2(params: {
  asset: PublicKey
  collection?: PublicKey
  authority?: PublicKey
  payer: PublicKey
  owner?: PublicKey
  updateAuthority?: PublicKey
  name: string
  uri: string
  plugins?: CorePlugin[]
}): TransactionInstruction {
  const {
    asset,
    collection,
    authority,
    payer,
    owner,
    updateAuthority,
    name,
    uri,
    plugins = [],
  } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.CreateV2),
    serializeString(name),
    serializeString(uri),
    serializePluginsList(plugins),
  ])

  const keys = [
    { pubkey: asset, isSigner: true, isWritable: true },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: owner ?? payer, isSigner: false, isWritable: false },
    { pubkey: updateAuthority ?? payer, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Create a Core collection (createCollectionV2)
 */
export function createCollectionV2(params: {
  collection: PublicKey
  payer: PublicKey
  updateAuthority?: PublicKey
  name: string
  uri: string
  plugins?: CorePlugin[]
}): TransactionInstruction {
  const {
    collection,
    payer,
    updateAuthority,
    name,
    uri,
    plugins = [],
  } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.CreateCollectionV2),
    serializeString(name),
    serializeString(uri),
    serializePluginsList(plugins),
  ])

  const keys = [
    { pubkey: collection, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: updateAuthority ?? payer, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Transfer a Core asset (transferV1)
 */
export function transferV1(params: {
  asset: PublicKey
  collection?: PublicKey
  payer: PublicKey
  authority?: PublicKey
  newOwner: PublicKey
}): TransactionInstruction {
  const { asset, collection, payer, authority, newOwner } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.TransferV1),
  ])

  const keys = [
    { pubkey: asset, isSigner: false, isWritable: true },
    { pubkey: newOwner, isSigner: false, isWritable: false },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Burn a Core asset (burnV1)
 */
export function burnV1(params: {
  asset: PublicKey
  collection?: PublicKey
  payer: PublicKey
  authority?: PublicKey
}): TransactionInstruction {
  const { asset, collection, payer, authority } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.BurnV1),
  ])

  const keys = [
    { pubkey: asset, isSigner: false, isWritable: true },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Update a Core asset (updateV1)
 */
export function updateV1(params: {
  asset: PublicKey
  collection?: PublicKey
  payer: PublicKey
  authority?: PublicKey
  newName?: string
  newUri?: string
  newUpdateAuthority?: PublicKey
}): TransactionInstruction {
  const { asset, collection, payer, authority, newName, newUri, newUpdateAuthority } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.UpdateV1),
    serializeOption(newName, serializeString),
    serializeOption(newUri, serializeString),
    serializeOption(
      newUpdateAuthority,
      (v) => Buffer.concat([serializeU8(UpdateAuthorityType.Address), v.toBuffer()]),
    ),
  ])

  const keys = [
    { pubkey: asset, isSigner: false, isWritable: true },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Update a Core collection (updateCollectionV1)
 */
export function updateCollectionV1(params: {
  collection: PublicKey
  payer: PublicKey
  authority?: PublicKey
  newName?: string
  newUri?: string
  newUpdateAuthority?: PublicKey
}): TransactionInstruction {
  const { collection, payer, authority, newName, newUri, newUpdateAuthority } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.UpdateCollectionV1),
    serializeOption(newName, serializeString),
    serializeOption(newUri, serializeString),
    serializeOption(
      newUpdateAuthority,
      (v) => Buffer.concat([serializeU8(UpdateAuthorityType.Address), v.toBuffer()]),
    ),
  ])

  const keys = [
    { pubkey: collection, isSigner: false, isWritable: true },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Add a plugin to a Core asset (addPluginV1)
 */
export function addPluginV1(params: {
  asset: PublicKey
  collection?: PublicKey
  payer: PublicKey
  authority?: PublicKey
  plugin: CorePlugin
}): TransactionInstruction {
  const { asset, collection, payer, authority, plugin } = params

  const pluginAuthority = ('authority' in plugin && plugin.authority)
    ? serializeAuthority(plugin.authority as CorePluginAuthority)
    : serializeU8(AuthorityType.UpdateAuthority)

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.AddPluginV1),
    serializePlugin(plugin),
    serializeOption(undefined, () => pluginAuthority), // init authority (None = default)
  ])

  const keys = [
    { pubkey: asset, isSigner: false, isWritable: true },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Remove a plugin from a Core asset (removePluginV1)
 */
export function removePluginV1(params: {
  asset: PublicKey
  collection?: PublicKey
  payer: PublicKey
  authority?: PublicKey
  pluginType: string
}): TransactionInstruction {
  const { asset, collection, payer, authority, pluginType } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.RemovePluginV1),
    serializeU8(getPluginTypeDiscriminator(pluginType)),
  ])

  const keys = [
    { pubkey: asset, isSigner: false, isWritable: true },
    { pubkey: collection ?? PROGRAM_ID, isSigner: false, isWritable: collection ? true : false },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Add a plugin to a Core collection (addCollectionPluginV1)
 */
export function addCollectionPluginV1(params: {
  collection: PublicKey
  payer: PublicKey
  authority?: PublicKey
  plugin: CorePlugin
}): TransactionInstruction {
  const { collection, payer, authority, plugin } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.AddCollectionPluginV1),
    serializePlugin(plugin),
    Buffer.from([0]), // init authority = None
  ])

  const keys = [
    { pubkey: collection, isSigner: false, isWritable: true },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}

/**
 * Remove a plugin from a Core collection (removeCollectionPluginV1)
 */
export function removeCollectionPluginV1(params: {
  collection: PublicKey
  payer: PublicKey
  authority?: PublicKey
  pluginType: string
}): TransactionInstruction {
  const { collection, payer, authority, pluginType } = params

  const data = Buffer.concat([
    serializeU8(MplCoreInstruction.RemoveCollectionPluginV1),
    serializeU8(getPluginTypeDiscriminator(pluginType)),
  ])

  const keys = [
    { pubkey: collection, isSigner: false, isWritable: true },
    { pubkey: authority ?? payer, isSigner: true, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ]

  return new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  })
}
