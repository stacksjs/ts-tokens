import { describe, test, expect, mock } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'

// Mock the hooks module before importing the component.
// useNFT depends on context (useConnection, useConfig), so we mock at the hook level.
mock.module('../../src/hooks', () => ({
  useNFT: () => ({
    nft: {
      mint: 'abc123',
      name: 'Test NFT',
      symbol: 'TNFT',
      uri: 'https://example.com/metadata.json',
      image: 'https://img.example.com/nft.png',
      description: 'A test NFT for unit testing',
    },
    loading: false,
    error: null,
    refetch: async () => {},
  }),
}))

// Mock context exports to prevent "must be used within a TokensProvider" errors
mock.module('../../src/context', () => ({
  useConnection: () => ({}),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { NFTCard } from '../../src/components/NFTCard'

describe('NFTCard', () => {
  test('renders NFT name', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).toContain('Test NFT')
  })

  test('renders NFT symbol', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).toContain('TNFT')
  })

  test('renders NFT image', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    const img = container.querySelector('img')!
    expect(img).not.toBeNull()
    expect(img.getAttribute('src')).toBe('https://img.example.com/nft.png')
    expect(img.getAttribute('alt')).toBe('Test NFT')
  })

  test('does not show description by default', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    expect(container.textContent).not.toContain('A test NFT for unit testing')
  })

  test('shows description when showDetails is true', () => {
    const { container } = render(<NFTCard mint="abc123" showDetails={true} />)
    expect(container.textContent).toContain('A test NFT for unit testing')
  })

  test('applies className', () => {
    const { container } = render(<NFTCard mint="abc123" className="nft-card" />)
    const div = container.firstElementChild as HTMLElement
    expect(div.className).toBe('nft-card')
  })

  test('has card-like styling', () => {
    const { container } = render(<NFTCard mint="abc123" />)
    const div = container.firstElementChild as HTMLElement
    expect(div.style.border).toBe('1px solid #ddd')
    expect(div.style.borderRadius).toBe('8px')
    expect(div.style.overflow).toBe('hidden')
  })
})
