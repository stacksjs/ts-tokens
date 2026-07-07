/**
 * Compressed NFT Minting
 *
 * Mint compressed NFTs to Merkle trees.
 */

import { PublicKey } from '@solana/web3.js'
import type { TokenConfig, TransactionResult, TransactionOptions } from '../../types'
import { sendAndConfirmTransaction, buildTransaction } from '../../drivers/solana/transaction'
import { loadWallet } from '../../drivers/solana/wallet'
import { createConnection } from '../../drivers/solana/connection'
import { mintV1, mintToCollectionV1 } from '../../programs/bubblegum/instructions'
import { findTreeAuthorityPda, findAssetId } from '../../programs/bubblegum/pda'
import { TokenProgramVersion, TokenStandard } from '../../programs/bubblegum/types'
import type { MetadataArgs } from '../../programs/bubblegum/types'

/**
 * Token Metadata Program ID
 */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')

/**
 * Compressed NFT metadata
 */
export interface CompressedNFTMetadata {
  name: string
  symbol: string
  uri: string
  sellerFeeBasisPoints: number
  creators?: Array<{ address: string; verified: boolean; share: number }>
  collection?: { key: string; verified: boolean }
  isMutable?: boolean
  primarySaleHappened?: boolean
}

/**
 * Mint compressed NFT options
 */
export interface MintCompressedNFTOptions {
  tree: string
  metadata: CompressedNFTMetadata
  leafOwner?: string
  leafDelegate?: string
  options?: TransactionOptions
}

/**
 * Compressed NFT result
 */
export interface CompressedNFTResult {
  signature: string
  leafIndex: number
  assetId: string
}

/**
 * Convert user-facing metadata to Bubblegum MetadataArgs
 */
function toMetadataArgs(metadata: CompressedNFTMetadata): MetadataArgs {
  return {
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    sellerFeeBasisPoints: metadata.sellerFeeBasisPoints,
    primarySaleHappened: metadata.primarySaleHappened ?? false,
    isMutable: metadata.isMutable !== false,
    editionNonce: null,
    tokenStandard: TokenStandard.NonFungible,
    collection: metadata.collection
      ? {
          // The program verifies collection membership itself during
          // mint_to_collection_v1 — passing verified: true up front is rejected
          verified: false,
          key: new PublicKey(metadata.collection.key),
        }
      : null,
    uses: null,
    tokenProgramVersion: TokenProgramVersion.Original,
    creators: (metadata.creators ?? []).map(creator => ({
      address: new PublicKey(creator.address),
      verified: creator.verified,
      share: creator.share,
    })),
  }
}

/**
 * Read the number of already-minted leaves from the tree config so the
 * minted leaf index (and asset id) can be derived deterministically.
 */
async function getNumMinted(
  connection: ReturnType<typeof createConnection>,
  treeAuthority: PublicKey
): Promise<number> {
  const info = await connection.getAccountInfo(treeAuthority)
  if (!info) {
    throw new Error('Tree config account not found — is the tree initialized?')
  }
  // TreeConfig: discriminator(8) + tree_creator(32) + tree_delegate(32) +
  // total_mint_capacity(u64) + num_minted(u64) + ...
  return Number(info.data.readBigUInt64LE(8 + 32 + 32 + 8))
}

/**
 * Mint a compressed NFT
 */
export async function mintCompressedNFT(
  mintOptions: MintCompressedNFTOptions,
  tokenConfig: TokenConfig
): Promise<CompressedNFTResult> {
  const connection = createConnection(tokenConfig)
  const payer = loadWallet(tokenConfig)

  const treePubkey = new PublicKey(mintOptions.tree)
  const leafOwner = mintOptions.leafOwner
    ? new PublicKey(mintOptions.leafOwner)
    : payer.publicKey
  const leafDelegate = mintOptions.leafDelegate
    ? new PublicKey(mintOptions.leafDelegate)
    : leafOwner

  const [treeAuthority] = findTreeAuthorityPda(treePubkey)
  const metadata = toMetadataArgs(mintOptions.metadata)

  // Capture the leaf index before minting: the new leaf lands at num_minted
  const leafIndex = await getNumMinted(connection, treeAuthority)

  const common = {
    merkleTree: treePubkey,
    treeAuthority,
    leafOwner,
    leafDelegate,
    payer: payer.publicKey,
    treeDelegate: payer.publicKey,
    metadata,
  }

  let instruction
  if (mintOptions.metadata.collection) {
    const collectionMint = new PublicKey(mintOptions.metadata.collection.key)
    const [collectionMetadata] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )
    const [collectionMasterEdition] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from('edition'),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )

    instruction = mintToCollectionV1({
      ...common,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      collectionAuthority: payer.publicKey,
    })
  } else {
    instruction = mintV1(common)
  }

  // Build and send transaction
  const transaction = await buildTransaction(
    connection,
    [instruction],
    payer.publicKey,
    mintOptions.options
  )

  transaction.partialSign(payer)

  const result = await sendAndConfirmTransaction(connection, transaction, mintOptions.options)

  const [assetId] = findAssetId(treePubkey, BigInt(leafIndex))

  return {
    signature: result.signature,
    leafIndex,
    assetId: assetId.toBase58(),
  }
}

/**
 * Mint multiple compressed NFTs in batch
 */
export async function mintCompressedNFTBatch(
  tree: string,
  items: CompressedNFTMetadata[],
  tokenConfig: TokenConfig,
  options?: TransactionOptions
): Promise<{ signatures: string[]; count: number }> {
  const signatures: string[] = []

  // Mint in batches to avoid transaction size limits
  const BATCH_SIZE = 5

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE)

    for (const metadata of batch) {
      const result = await mintCompressedNFT(
        { tree, metadata, options },
        tokenConfig
      )
      signatures.push(result.signature)
    }
  }

  return {
    signatures,
    count: items.length,
  }
}
