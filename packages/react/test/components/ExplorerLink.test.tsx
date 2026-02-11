import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'
import { ExplorerLink } from '../../src/components/ExplorerLink'

const TEST_SIGNATURE = '5UfDuXtmakBfJ7eTXPMnFJnFbSHnBdUPhFGsLwWruG9PqoZ3V1zFxoRfgJm1DcYNpe6eZxbr4ByHPMw5MQbnaXs'
const TEST_ADDRESS = 'DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3'

describe('ExplorerLink', () => {
  test('renders transaction link on devnet by default', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toBe(
      `https://explorer.solana.com/tx/${TEST_SIGNATURE}?cluster=devnet`
    )
  })

  test('renders address link on devnet', () => {
    const { container } = render(<ExplorerLink address={TEST_ADDRESS} />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toBe(
      `https://explorer.solana.com/address/${TEST_ADDRESS}?cluster=devnet`
    )
  })

  test('renders mainnet link without cluster param', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} cluster="mainnet-beta" />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toBe(
      `https://explorer.solana.com/tx/${TEST_SIGNATURE}`
    )
  })

  test('renders testnet link with cluster param', () => {
    const { container } = render(<ExplorerLink address={TEST_ADDRESS} cluster="testnet" />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toBe(
      `https://explorer.solana.com/address/${TEST_ADDRESS}?cluster=testnet`
    )
  })

  test('renders truncated signature as label', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} />)
    const a = container.querySelector('a')!
    expect(a.textContent).toBe(TEST_SIGNATURE.slice(0, 8) + '...')
  })

  test('renders truncated address as label', () => {
    const { container } = render(<ExplorerLink address={TEST_ADDRESS} />)
    const a = container.querySelector('a')!
    expect(a.textContent).toBe(TEST_ADDRESS.slice(0, 8) + '...')
  })

  test('renders "View" when neither signature nor address provided', () => {
    const { container } = render(<ExplorerLink />)
    const a = container.querySelector('a')!
    expect(a.textContent).toBe('View')
    expect(a.getAttribute('href')).toBe('#')
  })

  test('prefers signature over address when both provided', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} address={TEST_ADDRESS} />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('href')).toContain('/tx/')
    expect(a.getAttribute('href')).not.toContain('/address/')
  })

  test('opens in new tab with security attributes', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} />)
    const a = container.querySelector('a')!
    expect(a.getAttribute('target')).toBe('_blank')
    expect(a.getAttribute('rel')).toBe('noopener noreferrer')
  })

  test('applies className', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} className="explorer" />)
    const a = container.querySelector('a')!
    expect(a.className).toBe('explorer')
  })

  test('has default link color styling', () => {
    const { container } = render(<ExplorerLink signature={TEST_SIGNATURE} />)
    const a = container.querySelector('a')!
    expect(a.style.color).toBe('#1976D2')
    expect(a.style.textDecoration).toBe('none')
  })

  test('merges custom style with default styles', () => {
    const { container } = render(
      <ExplorerLink signature={TEST_SIGNATURE} style={{ fontSize: '14px' }} />
    )
    const a = container.querySelector('a')!
    expect(a.style.fontSize).toBe('14px')
    expect(a.style.color).toBe('#1976D2')
  })
})
