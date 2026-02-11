import { describe, test, expect, mock } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'

// Mock the hooks module to return null nft (not found)
mock.module('../../src/hooks', () => ({
  useNFT: () => ({
    nft: null,
    loading: false,
    error: null,
    refetch: async () => {},
  }),
}))

mock.module('../../src/context', () => ({
  useConnection: () => ({}),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { NFTCard } from '../../src/components/NFTCard'

describe('NFTCard - not found state', () => {
  test('shows not found text when nft is null', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).toBe('NFT not found')
  })
})
