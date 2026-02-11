/**
 * Compatibility Layer
 *
 * Provides Metaplex SDK compatibility shim and type aliases.
 */

export { Metaplex } from './metaplex-shim'
export type { MetaplexNftClient } from './metaplex-shim'

export {
  toMetaplexNft,
  fromMetaplexUpdateInput,
} from './types'

export type {
  Sft,
  Nft,
  NftWithToken,
  SftWithToken,
  MetaplexMetadata,
  FindNftByMintInput,
  UpdateNftInput,
  CreateNftInput,
} from './types'
