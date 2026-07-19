import { describe, test, expect, afterEach } from 'bun:test'
import { createHash } from 'node:crypto'
import nacl from 'tweetnacl'
import { Keypair } from '@solana/web3.js'
import {
  createArweaveAdapter,
  createSignedDataItem,
  serializeAvroTags,
  serializeDataItem,
  bundleTransactions,
  getDataItemId,
  base64UrlEncode,
  ANS104_SIG_TYPE_ED25519,
} from '../src/storage/arweave'
import { createIPFSAdapter } from '../src/storage/ipfs'
import {
  createShadowDriveAdapter,
  parseStorageAccount,
  estimateShdwCost,
} from '../src/storage/shadow-drive'
import { setWallet, clearWallet } from '../src/drivers/solana/wallet'
import { createTestConfig } from './helpers'

const originalFetch = globalThis.fetch
const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s)

afterEach(() => {
  globalThis.fetch = originalFetch
  clearWallet()
  delete process.env.PINATA_JWT
})

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0))
  let o = 0
  for (const p of parts) {
    out.set(p, o)
    o += p.length
  }
  return out
}

// Reference re-implementation of the Arweave deep-hash (arbundles-compatible)
// used to independently verify data item signatures.
function sha384(data: Uint8Array): Uint8Array {
  return new Uint8Array(createHash('sha384').update(data).digest())
}
function deepHashBlob(data: Uint8Array): Uint8Array {
  return sha384(concat(sha384(concat(utf8('blob'), utf8(String(data.length)))), data))
}
function deepHashList(chunks: Uint8Array[]): Uint8Array {
  let acc = sha384(concat(utf8('list'), utf8(String(chunks.length))))
  for (const chunk of chunks) {
    acc = sha384(concat(acc, deepHashBlob(chunk)))
  }
  return acc
}

function stubFetch(handler: (url: string, init?: any) => any) {
  globalThis.fetch = (async (url: any, init?: any) => handler(String(url), init)) as any
}

function jsonResponse(body: unknown) {
  return { ok: true, status: 200, json: async () => body, text: async () => JSON.stringify(body) }
}

describe('ANS-104 data items', () => {
  const keypair = nacl.sign.keyPair()
  const signer = { publicKey: keypair.publicKey, secretKey: keypair.secretKey }

  test('signature type byte is 2 (ed25519), with correct offsets', () => {
    const data = utf8('hello arweave')
    const tags = [{ name: 'Content-Type', value: 'application/json' }]
    const { raw, signature } = createSignedDataItem(data, tags, signer)

    // [0..2) signature type, little-endian u16 = 2
    expect(raw[0]).toBe(ANS104_SIG_TYPE_ED25519)
    expect(raw[0]).toBe(2)
    expect(raw[1]).toBe(0)

    // [2..66) 64-byte ed25519 signature
    expect(Buffer.from(raw.subarray(2, 66)).equals(Buffer.from(signature))).toBe(true)

    // [66..98) 32-byte owner (ed25519 public key)
    expect(Buffer.from(raw.subarray(66, 98)).equals(Buffer.from(keypair.publicKey))).toBe(true)

    // [98] target presence = 0, [99] anchor presence = 0
    expect(raw[98]).toBe(0)
    expect(raw[99]).toBe(0)

    // [100..108) tag count (8 bytes LE) = 1
    const tagCount = new DataView(raw.buffer, raw.byteOffset + 100, 8).getUint32(0, true)
    expect(tagCount).toBe(1)

    // [108..116) tag byte length (8 bytes LE) = avro payload length
    const avro = serializeAvroTags(tags)
    const tagBytesLen = new DataView(raw.buffer, raw.byteOffset + 108, 8).getUint32(0, true)
    expect(tagBytesLen).toBe(avro.length)

    // [116..116+len) avro tags, then the raw data
    expect(Buffer.from(raw.subarray(116, 116 + avro.length)).equals(Buffer.from(avro))).toBe(true)
    expect(Buffer.from(raw.subarray(116 + avro.length)).equals(Buffer.from(data))).toBe(true)
  })

  test('item ID is base64url(sha256(signature))', () => {
    const { id, signature } = createSignedDataItem(utf8('data'), [], signer)
    const expected = base64UrlEncode(
      new Uint8Array(createHash('sha256').update(signature).digest())
    )
    expect(id).toBe(expected)
    expect(id).toBe(getDataItemId(signature))
    // base64url alphabet only, no padding
    expect(id).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(id).not.toContain('=')
  })

  test('signature verifies against the arbundles-style deep-hash message', () => {
    const data = utf8('verify me')
    const tags = [
      { name: 'Content-Type', value: 'text/plain' },
      { name: 'App', value: 'ts-tokens' },
    ]
    const { signature } = createSignedDataItem(data, tags, signer)
    const message = deepHashList([
      utf8('dataitem'),
      utf8('1'),
      utf8('2'),
      keypair.publicKey,
      new Uint8Array(0),
      new Uint8Array(0),
      serializeAvroTags(tags),
      data,
    ])
    expect(nacl.sign.detached.verify(message, signature, keypair.publicKey)).toBe(true)
  })

  test('accepts a base58 public key and a 32-byte seed', () => {
    const kp = Keypair.generate()
    // 64-byte Solana secret key + base58 public key string
    const a = createSignedDataItem(utf8('x'), [], {
      publicKey: kp.publicKey.toBase58(),
      secretKey: kp.secretKey,
    })
    expect(Buffer.from(a.owner).equals(kp.publicKey.toBuffer())).toBe(true)
    // 32-byte seed + raw public key
    const seed = kp.secretKey.slice(0, 32)
    const b = createSignedDataItem(utf8('x'), [], {
      publicKey: kp.publicKey.toBytes(),
      secretKey: seed,
    })
    expect(Buffer.from(b.raw).equals(Buffer.from(a.raw))).toBe(true)
  })

  test('rejects a mismatched keypair', () => {
    const other = nacl.sign.keyPair()
    expect(() =>
      createSignedDataItem(utf8('x'), [], {
        publicKey: other.publicKey,
        secretKey: keypair.secretKey,
      })
    ).toThrow(/does not match/)
  })
})

describe('ANS-104 Avro tag serialization', () => {
  test('empty tags encode as a single zero byte', () => {
    expect(Array.from(serializeAvroTags([]))).toEqual([0])
  })

  test('one-tag fixture matches exact Avro bytes', () => {
    const avro = serializeAvroTags([{ name: 'Content-Type', value: 'application/json' }])
    const expected = Buffer.concat([
      Buffer.from([0x02]), // array: 1 block (zigzag varint 2)
      Buffer.from([0x18]), // name length 12 (zigzag varint 24)
      Buffer.from('Content-Type', 'utf8'),
      Buffer.from([0x20]), // value length 16 (zigzag varint 32)
      Buffer.from('application/json', 'utf8'),
      Buffer.from([0x00]), // array terminator
    ])
    expect(Buffer.from(avro).equals(expected)).toBe(true)
  })

  test('multiple tags start with the block count', () => {
    const avro = serializeAvroTags([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ])
    expect(avro[0]).toBe(0x04) // 2 blocks (zigzag varint 4)
    expect(avro[avro.length - 1]).toBe(0x00) // terminator
  })
})

describe('ANS-104 bundle format', () => {
  const keypair = nacl.sign.keyPair()
  const signer = { publicKey: keypair.publicKey, secretKey: keypair.secretKey }

  test('header contains sha256(signature) as the item ID', () => {
    const data = utf8('bundle me')
    const tags = [{ name: 'Content-Type', value: 'text/plain' }]
    const item = createSignedDataItem(data, tags, signer)
    const bundle = bundleTransactions([
      { data, tags, owner: item.owner, signature: item.signature },
    ])

    // [0..32) item count = 1
    expect(new DataView(bundle.buffer, 0, 4).getUint32(0, true)).toBe(1)
    // [32..64) byte length of the serialized item
    expect(new DataView(bundle.buffer, 32, 4).getUint32(0, true)).toBe(item.raw.length)
    // [64..96) item ID = sha256(signature)
    const idBytes = bundle.subarray(64, 96)
    const expectedId = createHash('sha256').update(item.signature).digest()
    expect(Buffer.from(idBytes).equals(expectedId)).toBe(true)
    // then the serialized item itself
    expect(Buffer.from(bundle.subarray(96)).equals(Buffer.from(item.raw))).toBe(true)
  })

  test('throws for unsigned items', () => {
    expect(() =>
      bundleTransactions([{ data: utf8('x'), tags: [], owner: keypair.publicKey }])
    ).toThrow(/signed data items/)
  })

  test('serializeDataItem zero-fills an absent signature', () => {
    const raw = serializeDataItem({ data: utf8('x'), tags: [], owner: keypair.publicKey })
    expect(raw.subarray(2, 66).every(b => b === 0)).toBe(true)
  })
})

describe('Arweave adapter — Irys upload flow', () => {
  const keypair = nacl.sign.keyPair()
  const signer = { publicKey: keypair.publicKey, secretKey: keypair.secretKey }

  test('successful upload posts the signed data item and returns the arweave.net URL', async () => {
    const adapter = createArweaveAdapter({ irysNode: 'https://irys.test' })
    adapter.setWallet(signer)

    const calls: Array<{ url: string; init?: any }> = []
    stubFetch((url, init) => {
      calls.push({ url, init })
      if (url.startsWith('https://irys.test/price/arweave/')) {
        return { ok: true, status: 200, text: async () => '1000' }
      }
      if (url.startsWith('https://irys.test/account/balance/arweave')) {
        return jsonResponse({ balance: '1000000' })
      }
      if (url === 'https://irys.test/tx/arweave') {
        return { ok: true, status: 200, text: async () => '' }
      }
      if (url.startsWith('https://arweave.net/price/')) {
        return { ok: true, status: 200, text: async () => '1000' }
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    const data = utf8('metadata json')
    const result = await adapter.upload(data, { contentType: 'application/json' })

    const expected = createSignedDataItem(
      data,
      [{ name: 'Content-Type', value: 'application/json' }],
      signer
    )
    expect(result.id).toBe(expected.id)
    expect(result.url).toBe(`https://arweave.net/${expected.id}`)
    expect(result.provider).toBe('arweave')

    const post = calls.find(c => c.url === 'https://irys.test/tx/arweave')
    expect(post).toBeDefined()
    expect(post!.init.method).toBe('POST')
    expect(post!.init.headers['Content-Type']).toBe('application/octet-stream')
    const body = new Uint8Array(post!.init.body)
    expect(Buffer.from(body).equals(Buffer.from(expected.raw))).toBe(true)

    // balance was checked for the signer's base58 address
    const balanceCall = calls.find(c => c.url.includes('/account/balance/'))
    const { encode: encodeBase58 } = await import('../src/utils/base58')
    expect(balanceCall!.url).toContain(`address=${encodeBase58(keypair.publicKey)}`)
  })

  test('insufficient balance throws an actionable error with amounts', async () => {
    const adapter = createArweaveAdapter({ irysNode: 'https://irys.test' })
    adapter.setWallet(signer)

    stubFetch(url => {
      if (url.startsWith('https://irys.test/price/arweave/')) {
        return { ok: true, status: 200, text: async () => '5000' }
      }
      if (url.startsWith('https://irys.test/account/balance/arweave')) {
        return jsonResponse({ balance: '100' })
      }
      if (url.startsWith('https://arweave.net/price/')) {
        return { ok: true, status: 200, text: async () => '5000' }
      }
      throw new Error(`unexpected fetch: ${url}`)
    })

    const err = await adapter.upload(utf8('data')).catch(e => e)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toMatch(/Insufficient Irys balance/)
    expect(err.message).toContain('5000 winston')
    expect(err.message).toContain('100 winston')
    expect(err.message).toMatch(/[Ff]und/)
  })

  test('node price failure includes the underlying error', async () => {
    const adapter = createArweaveAdapter({ irysNode: 'https://irys.test' })
    adapter.setWallet(signer)

    stubFetch(url => {
      if (url.startsWith('https://arweave.net/price/')) {
        return { ok: true, status: 200, text: async () => '1' }
      }
      throw new Error('connection refused')
    })

    const err = await adapter.upload(utf8('data')).catch(e => e)
    expect(err.message).toMatch(/Failed to get upload price/)
    expect(err.message).toContain('connection refused')
  })

  test('missing wallet throws an actionable error before any network call', async () => {
    const adapter = createArweaveAdapter({ irysNode: 'https://irys.test' })
    stubFetch(() => {
      throw new Error('network should not be touched')
    })
    const err = await adapter.upload(utf8('data')).catch(e => e)
    expect(err.message).toMatch(/Solana keypair/)
    expect(err.message).toMatch(/TOKENS_KEYPAIR/)
  })
})

describe('Shadow Drive adapter', () => {
  test('signed upload message contains the file SHA-256 hex', async () => {
    const keypair = Keypair.generate()
    setWallet(keypair)

    const storageAccount = Keypair.generate().publicKey.toBase58()
    const adapter = createShadowDriveAdapter({
      storageAccount,
      endpoint: 'https://shdw.test',
    })
    adapter.setTokenConfig(createTestConfig())

    let captured: { url: string; init?: any } | undefined
    stubFetch((url, init) => {
      captured = { url, init }
      return jsonResponse({ finalized_location: 'https://shdw.test/file_1' })
    })

    const bytes = utf8('shadow drive payload')
    await adapter.upload(bytes)

    expect(captured).toBeDefined()
    expect(captured!.url).toBe('https://shdw.test/upload')

    const signature = new Uint8Array(
      Buffer.from(captured!.init.headers['x-shadow-signature'], 'base64')
    )
    const fileHash = createHash('sha256').update(bytes).digest('hex')
    const expectedMessage = utf8(
      `Shadow Drive Signed Message:\nStorage Account: ${storageAccount}\nUpload files with hash: ${fileHash}`
    )
    // The signature must verify over a message embedding the sha256 hex —
    // proving the hash (not the generated filename) was signed.
    expect(
      nacl.sign.detached.verify(expectedMessage, signature, keypair.publicKey.toBytes())
    ).toBe(true)
    expect(captured!.init.headers['x-shadow-signer']).toBe(keypair.publicKey.toBase58())
  })

  test('estimateShdwCost throws instead of returning fabricated pricing', () => {
    expect(() => estimateShdwCost(1024)).toThrow(/fabricated|unavailable/i)
  })

  test('adapter estimateCost throws instead of returning fabricated pricing', async () => {
    const adapter = createShadowDriveAdapter({ endpoint: 'https://shdw.test' })
    await expect(adapter.estimateCost(1024)).rejects.toThrow(/unavailable/i)
  })
})

describe('parseStorageAccount (unverified layout, graceful failure)', () => {
  test('returns null for short buffers', () => {
    expect(parseStorageAccount(Buffer.alloc(10))).toBeNull()
  })

  test('returns null when not initialized', () => {
    const buf = Buffer.alloc(100)
    buf.writeUInt8(0, 8) // isInitialized = false
    expect(parseStorageAccount(buf)).toBeNull()
  })

  test('parses a fabricated buffer matching the assumed layout', () => {
    const owner = Keypair.generate().publicKey
    const buf = Buffer.alloc(66)
    buf.writeUInt8(1, 8)
    owner.toBuffer().copy(buf, 9)
    buf.writeBigUInt64LE(2048n, 41)
    buf.writeBigUInt64LE(512n, 49)
    buf.writeUInt8(1, 57)
    buf.writeBigInt64LE(1700000000n, 58)

    const parsed = parseStorageAccount(buf)
    expect(parsed).not.toBeNull()
    expect(parsed!.isInitialized).toBe(true)
    expect(parsed!.owner.toBase58()).toBe(owner.toBase58())
    expect(parsed!.totalStorage).toBe(2048n)
    expect(parsed!.usedStorage).toBe(512n)
    expect(parsed!.immutable).toBe(true)
    expect(parsed!.creationTime).toBe(1700000000n)
  })
})

describe('IPFS adapter', () => {
  test('nft.storage throws a decommissioned error', async () => {
    const adapter = createIPFSAdapter({ pinningService: 'nft.storage', pinningApiKey: 'x' })
    await expect(adapter.upload(new Uint8Array([1]))).rejects.toThrow(/decommissioned/i)
    await expect(adapter.upload(new Uint8Array([1]))).rejects.toThrow(/pinata/i)
  })

  test('web3.storage throws a decommissioned error', async () => {
    const adapter = createIPFSAdapter({ pinningService: 'web3.storage', pinningApiKey: 'x' })
    await expect(adapter.upload(new Uint8Array([1]))).rejects.toThrow(/decommissioned/i)
  })

  test('pinata request shape: URL, POST, Bearer JWT', async () => {
    let captured: { url: string; init?: any } | undefined
    stubFetch((url, init) => {
      captured = { url, init }
      return jsonResponse({ IpfsHash: 'QmTestCid123' })
    })

    const adapter = createIPFSAdapter({ pinningService: 'pinata', pinningApiKey: 'jwt-abc' })
    const result = await adapter.upload(new Uint8Array([1, 2, 3]))

    expect(captured!.url).toBe('https://api.pinata.cloud/pinning/pinFileToIPFS')
    expect(captured!.init.method).toBe('POST')
    expect(captured!.init.headers.Authorization).toBe('Bearer jwt-abc')
    expect(result.id).toBe('QmTestCid123')
    expect(result.url).toBe('https://ipfs.io/ipfs/QmTestCid123')
  })

  test('PINATA_JWT env var auto-selects pinata without config', async () => {
    process.env.PINATA_JWT = 'env-jwt'
    let captured: { url: string; init?: any } | undefined
    stubFetch((url, init) => {
      captured = { url, init }
      return jsonResponse({ IpfsHash: 'QmEnvCid' })
    })

    const adapter = createIPFSAdapter({})
    const result = await adapter.upload(new Uint8Array([9]))

    expect(captured!.url).toBe('https://api.pinata.cloud/pinning/pinFileToIPFS')
    expect(captured!.init.headers.Authorization).toBe('Bearer env-jwt')
    expect(result.id).toBe('QmEnvCid')
  })

  test('local IPFS node via apiEndpoint', async () => {
    let captured: { url: string; init?: any } | undefined
    stubFetch((url, init) => {
      captured = { url, init }
      return jsonResponse({ Hash: 'QmLocalCid' })
    })

    const adapter = createIPFSAdapter({ apiEndpoint: 'http://localhost:5001' })
    const result = await adapter.upload(new Uint8Array([7]))

    expect(captured!.url).toBe('http://localhost:5001/api/v0/add')
    expect(captured!.init.method).toBe('POST')
    expect(result.id).toBe('QmLocalCid')
  })

  test('unconfigured adapter throws an actionable error', async () => {
    const adapter = createIPFSAdapter({})
    await expect(adapter.upload(new Uint8Array([1]))).rejects.toThrow(/PINATA_JWT|apiEndpoint/)
  })
})
