import { describe, test, expect, mock } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'

// Mock the hooks module to return error state
mock.module('../../src/hooks', () => ({
  useNFT: () => ({
    nft: null,
    loading: false,
    error: new Error('Failed to fetch'),
    refetch: async () => {},
  }),
}))

mock.module('../../src/context', () => ({
  useConnection: () => ({}),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { NFTCard } from '../../src/components/NFTCard'

describe('NFTCard - error state', () => {
  test('shows error text when there is an error', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).toBe('Error loading NFT')
  })
})
