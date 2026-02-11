import { describe, test, expect } from 'bun:test'
import React from 'react'
import { render } from '@testing-library/react'
import { SolAmount } from '../../src/components/SolAmount'

describe('SolAmount', () => {
  test('renders number amount with default 4 decimals and SOL symbol', () => {
    const { container } = render(<SolAmount amount={1.5} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('1.5000')
    expect(span.textContent).toContain('SOL')
  })

  test('renders bigint amount converted from lamports', () => {
    // 5 SOL = 5_000_000_000 lamports
    const { container } = render(<SolAmount amount={BigInt(5_000_000_000)} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('5.0000')
    expect(span.textContent).toContain('SOL')
  })

  test('respects custom decimals prop', () => {
    const { container } = render(<SolAmount amount={1.23456789} decimals={2} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('1.23')
  })

  test('hides SOL symbol when showSymbol is false', () => {
    const { container } = render(<SolAmount amount={1.5} showSymbol={false} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('1.5000')
    expect(span.textContent).not.toContain('SOL')
  })

  test('renders zero amount', () => {
    const { container } = render(<SolAmount amount={0} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('0.0000')
  })

  test('renders zero bigint amount', () => {
    const { container } = render(<SolAmount amount={BigInt(0)} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('0.0000')
  })

  test('renders fractional lamport amounts', () => {
    // 0.5 SOL = 500_000_000 lamports
    const { container } = render(<SolAmount amount={BigInt(500_000_000)} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('0.5000')
  })

  test('renders large amounts', () => {
    const { container } = render(<SolAmount amount={1000.123} decimals={3} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('1000.123')
  })

  test('applies className', () => {
    const { container } = render(<SolAmount amount={1} className="sol-amount" />)
    const span = container.querySelector('span')!
    expect(span.className).toBe('sol-amount')
  })

  test('applies inline style', () => {
    const { container } = render(<SolAmount amount={1} style={{ fontWeight: 'bold' }} />)
    const span = container.querySelector('span')!
    expect(span.style.fontWeight).toBe('bold')
  })

  test('renders with 0 decimals', () => {
    const { container } = render(<SolAmount amount={3.7} decimals={0} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('4')
  })

  test('handles very small bigint amounts', () => {
    // 1 lamport = 0.000000001 SOL
    const { container } = render(<SolAmount amount={BigInt(1)} decimals={9} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain('0.000000001')
  })
})
