import { describe, test, expect, mock } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'

// Mock the hooks module to return loading state
mock.module('../../src/hooks', () => ({
  useNFT: () => ({
    nft: null,
    loading: true,
    error: null,
    refetch: async () => {},
  }),
}))

mock.module('../../src/context', () => ({
  useConnection: () => ({}),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { NFTCard } from '../../src/components/NFTCard'

describe('NFTCard - loading state', () => {
  test('shows loading text when loading', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).toBe('Loading...')
  })
})
