/**
 * Solana Actions / Blinks Tests
 */

import { describe, test, expect } from 'bun:test'
import { Keypair } from '@solana/web3.js'
import {
  createTransferAction,
  createNFTMintAction,
  createSwapAction,
  createActionUrl,
  createActionsJson,
} from '../src/actions/create'
import { ACTION_CORS_HEADERS, createActionsServer } from '../src/actions/serve'
import type { ActionSpec, ActionLink } from '../src/actions/types'

// ---------------------------------------------------------------------------
// Action creators
// ---------------------------------------------------------------------------

describe('createTransferAction', () => {
  test('creates valid action spec', () => {
    const recipient = Keypair.generate().publicKey.toBase58()
    const spec = createTransferAction({ recipient })

    expect(spec.title).toContain(recipient.slice(0, 8))
    expect(spec.description).toContain(recipient)
    expect(spec.label).toBe('Transfer')
    expect(spec.links!.actions.length).toBeGreaterThan(0)
  })

  test('creates amount buttons when amounts provided', () => {
    const recipient = Keypair.generate().publicKey.toBase58()
    const spec = createTransferAction({
      recipient,
      amounts: [0.1, 0.5, 1.0],
    })

    expect(spec.links!.actions.length).toBe(3)
    expect(spec.links!.actions[0].label).toBe('Send 0.1 SOL')
    expect(spec.links!.actions[1].label).toBe('Send 0.5 SOL')
    expect(spec.links!.actions[2].label).toBe('Send 1 SOL')
  })

  test('creates input parameter when no amounts', () => {
    const recipient = Keypair.generate().publicKey.toBase58()
    const spec = createTransferAction({ recipient })

    const action = spec.links!.actions[0]
    expect(action.parameters).toBeTruthy()
    expect(action.parameters![0].name).toBe('amount')
    expect(action.parameters![0].type).toBe('number')
  })
})

describe('createNFTMintAction', () => {
  test('creates valid mint action spec', () => {
    const spec = createNFTMintAction({
      name: 'Cool NFT',
      price: 1.5,
      icon: 'https://example.com/nft.png',
    })

    expect(spec.title).toContain('Cool NFT')
    expect(spec.description).toContain('1.5 SOL')
    expect(spec.icon).toBe('https://example.com/nft.png')
    expect(spec.links!.actions.length).toBe(1)
  })
})

describe('createSwapAction', () => {
  test('creates valid swap action spec', () => {
    const spec = createSwapAction({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      inputSymbol: 'SOL',
      outputSymbol: 'USDC',
    })

    expect(spec.title).toContain('SOL')
    expect(spec.title).toContain('USDC')
    expect(spec.links!.actions[0].parameters).toBeTruthy()
    expect(spec.links!.actions[0].parameters![0].name).toBe('amount')
  })
})

// ---------------------------------------------------------------------------
// Action URL generation
// ---------------------------------------------------------------------------

describe('createActionUrl', () => {
  test('creates solana-action URL', () => {
    const url = createActionUrl('https://my-app.com', '/transfer?to=abc')
    expect(url).toBe('solana-action:https://my-app.com/transfer?to=abc')
  })
})

describe('createActionsJson', () => {
  test('creates valid actions.json manifest', () => {
    const manifest = createActionsJson([
      { pathPattern: '/transfer', apiPath: '/api/actions/transfer' },
      { pathPattern: '/mint', apiPath: '/api/actions/mint' },
    ])

    expect((manifest as any).rules.length).toBe(2)
    expect((manifest as any).rules[0].pathPattern).toBe('/transfer')
  })
})

// ---------------------------------------------------------------------------
// CORS headers
// ---------------------------------------------------------------------------

describe('ACTION_CORS_HEADERS', () => {
  test('includes required CORS headers', () => {
    expect(ACTION_CORS_HEADERS['Access-Control-Allow-Origin']).toBe('*')
    expect(ACTION_CORS_HEADERS['Access-Control-Allow-Methods']).toContain('GET')
    expect(ACTION_CORS_HEADERS['Access-Control-Allow-Methods']).toContain('POST')
    expect(ACTION_CORS_HEADERS['X-Action-Version']).toBeTruthy()
    expect(ACTION_CORS_HEADERS['X-Blockchain-Ids']).toContain('solana')
  })
})

// ---------------------------------------------------------------------------
// Actions server
// ---------------------------------------------------------------------------

describe('createActionsServer', () => {
  test('creates server with correct structure', () => {
    const server = createActionsServer([
      {
        path: '/transfer',
        getAction: () => ({
          icon: '',
          title: 'Test',
          description: 'Test',
          label: 'Test',
        }),
        postAction: async () => ({ transaction: '' }),
      },
    ], { port: 4000 })

    expect(server.port).toBe(4000)
    expect(server.routes.length).toBe(1)
    expect(typeof server.fetch).toBe('function')
  })

  test('fetch handles OPTIONS request', async () => {
    const server = createActionsServer([])
    const response = await server.fetch(new Request('http://localhost/actions.json', { method: 'OPTIONS' }))
    expect(response.status).toBe(200)
  })

  test('fetch serves actions.json', async () => {
    const server = createActionsServer([
      {
        path: '/test',
        getAction: () => ({ icon: '', title: '', description: '', label: '' }),
        postAction: async () => ({ transaction: '' }),
      },
    ])

    const response = await server.fetch(new Request('http://localhost/actions.json'))
    expect(response.status).toBe(200)

    const body = await response.json() as any
    expect(body.rules).toBeTruthy()
  })

  test('fetch returns 404 for unknown routes', async () => {
    const server = createActionsServer([])
    const response = await server.fetch(new Request('http://localhost/api/actions/unknown'))
    expect(response.status).toBe(404)
  })
})
