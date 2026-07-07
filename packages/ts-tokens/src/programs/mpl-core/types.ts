/**
 * MPL Core On-Chain Types
 *
 * Account layouts, discriminators, and plugin schemas for the MPL Core program.
 */

/**
 * MPL Core program ID
 */
export const MPL_CORE_PROGRAM_ID = 'CoREENxT6tW1HoK8ypY1SxRMZTcVPm7R94rH4PZNhX7d'

/**
 * Instruction discriminators for MPL Core.
 *
 * These are the single-byte instruction ordinals from the MPL Core IDL. They are
 * NOT contiguous by "kind" — the V1 ops occupy 0-19 and the V2 create ops are 20
 * and 21. Getting these wrong makes each builder invoke a different instruction
 * (e.g. CreateV2 as CreateV1, or RemovePluginV1 as RemoveCollectionPluginV1).
 */
export enum MplCoreInstruction {
  CreateV1 = 0,
  CreateCollectionV1 = 1,
  AddPluginV1 = 2,
  AddCollectionPluginV1 = 3,
  RemovePluginV1 = 4,
  RemoveCollectionPluginV1 = 5,
  UpdatePluginV1 = 6,
  UpdateCollectionPluginV1 = 7,
  ApprovePluginAuthorityV1 = 8,
  ApproveCollectionPluginAuthorityV1 = 9,
  RevokePluginAuthorityV1 = 10,
  RevokeCollectionPluginAuthorityV1 = 11,
  BurnV1 = 12,
  BurnCollectionV1 = 13,
  TransferV1 = 14,
  UpdateV1 = 15,
  UpdateCollectionV1 = 16,
  CompressV1 = 17,
  DecompressV1 = 18,
  Collect = 19,
  CreateV2 = 20,
  CreateCollectionV2 = 21,
}

/**
 * Plugin type discriminators (on-chain values)
 */
export enum PluginTypeDiscriminator {
  Royalties = 0,
  FreezeDelegate = 1,
  BurnDelegate = 2,
  TransferDelegate = 3,
  UpdateDelegate = 4,
  PermanentFreezeDelegate = 5,
  Attributes = 6,
  PermanentTransferDelegate = 7,
  PermanentBurnDelegate = 8,
  Edition = 9,
  MasterEdition = 10,
  AddBlocker = 11,
  ImmutableMetadata = 12,
  VerifiedCreators = 13,
  Autograph = 14,
  AppData = 15,
}

/**
 * Authority type discriminators
 */
export enum AuthorityType {
  Owner = 0,
  UpdateAuthority = 1,
  Address = 2,
  None = 3,
}

/**
 * Rule set type discriminators
 */
export enum RuleSetType {
  None = 0,
  ProgramAllowList = 1,
  ProgramDenyList = 2,
}

/**
 * Update authority type discriminators
 */
export enum UpdateAuthorityType {
  None = 0,
  Address = 1,
  Collection = 2,
}

/**
 * Core account discriminator (first byte)
 */
export enum CoreAccountType {
  Uninitialized = 0,
  Asset = 1,
  HashedAsset = 2,
  PluginHeaderV1 = 3,
  PluginRegistryV1 = 4,
  Collection = 5,
}

/**
 * Map plugin type string to discriminator
 */
export function getPluginTypeDiscriminator(pluginType: string): number {
  const map: Record<string, number> = {
    Royalties: PluginTypeDiscriminator.Royalties,
    FreezeDelegate: PluginTypeDiscriminator.FreezeDelegate,
    BurnDelegate: PluginTypeDiscriminator.BurnDelegate,
    TransferDelegate: PluginTypeDiscriminator.TransferDelegate,
    UpdateDelegate: PluginTypeDiscriminator.UpdateDelegate,
    PermanentFreezeDelegate: PluginTypeDiscriminator.PermanentFreezeDelegate,
    Attributes: PluginTypeDiscriminator.Attributes,
    PermanentTransferDelegate: PluginTypeDiscriminator.PermanentTransferDelegate,
    PermanentBurnDelegate: PluginTypeDiscriminator.PermanentBurnDelegate,
    Edition: PluginTypeDiscriminator.Edition,
    MasterEdition: PluginTypeDiscriminator.MasterEdition,
    AddBlocker: PluginTypeDiscriminator.AddBlocker,
    ImmutableMetadata: PluginTypeDiscriminator.ImmutableMetadata,
    VerifiedCreators: PluginTypeDiscriminator.VerifiedCreators,
    Autograph: PluginTypeDiscriminator.Autograph,
    AppData: PluginTypeDiscriminator.AppData,
  }
  return map[pluginType] ?? -1
}

/**
 * Serialize a string to a borsh-style buffer (u32 length prefix + UTF-8)
 */
export function serializeString(value: string): Buffer {
  const encoded = Buffer.from(value, 'utf-8')
  const buf = Buffer.alloc(4 + encoded.length)
  buf.writeUInt32LE(encoded.length, 0)
  encoded.copy(buf, 4)
  return buf
}

/**
 * Serialize a u8
 */
export function serializeU8(value: number): Buffer {
  const buf = Buffer.alloc(1)
  buf.writeUInt8(value, 0)
  return buf
}

/**
 * Serialize a u16
 */
export function serializeU16(value: number): Buffer {
  const buf = Buffer.alloc(2)
  buf.writeUInt16LE(value, 0)
  return buf
}

/**
 * Serialize a u32
 */
export function serializeU32(value: number): Buffer {
  const buf = Buffer.alloc(4)
  buf.writeUInt32LE(value, 0)
  return buf
}

/**
 * Serialize an optional value with a presence flag
 */
export function serializeOption<T>(value: T | undefined, serializer: (v: T) => Buffer): Buffer {
  if (value === undefined) {
    return Buffer.from([0])
  }
  return Buffer.concat([Buffer.from([1]), serializer(value)])
}
