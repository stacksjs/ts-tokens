import { describe, test, expect, mock, beforeEach } from 'bun:test'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import { AddressDisplay } from '../../src/components/AddressDisplay'

const TEST_ADDRESS = 'DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3'

describe('AddressDisplay', () => {
  let mockWriteText: ReturnType<typeof mock>

  beforeEach(() => {
    mockWriteText = mock(() => Promise.resolve())
    Object.assign(navigator, {
      clipboard: {
        writeText: mockWriteText,
      },
    })
  })

  test('renders truncated address by default', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    // Default: truncate=true, chars=4
    expect(span.textContent).toContain('DRpb...PZb3')
  })

  test('renders full address when truncate is false', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} truncate={false} />)
    const span = container.querySelector('span')!
    expect(span.textContent).toContain(TEST_ADDRESS)
  })

  test('respects custom chars prop', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} chars={8} />)
    const span = container.querySelector('span')!
    const expected = `${TEST_ADDRESS.slice(0, 8)}...${TEST_ADDRESS.slice(-8)}`
    expect(span.textContent).toContain(expected)
  })

  test('has title attribute with full address', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    expect(span.getAttribute('title')).toBe(TEST_ADDRESS)
  })

  test('has pointer cursor when copyable', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    expect(span.style.cursor).toBe('pointer')
  })

  test('has default cursor when not copyable', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} copyable={false} />)
    const span = container.querySelector('span')!
    expect(span.style.cursor).toBe('default')
  })

  test('has monospace font family', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    expect(span.style.fontFamily).toBe('monospace')
  })

  test('copies address to clipboard on click', async () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} />)
    const span = container.querySelector('span')!
    fireEvent.click(span)
    expect(mockWriteText).toHaveBeenCalledWith(TEST_ADDRESS)
  })

  test('does not copy when copyable is false', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} copyable={false} />)
    const span = container.querySelector('span')!
    fireEvent.click(span)
    expect(mockWriteText).not.toHaveBeenCalled()
  })

  test('applies className', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} className="addr-display" />)
    const span = container.querySelector('span')!
    expect(span.className).toBe('addr-display')
  })

  test('merges custom style with default styles', () => {
    const { container } = render(<AddressDisplay address={TEST_ADDRESS} style={{ fontSize: '16px' }} />)
    const span = container.querySelector('span')!
    expect(span.style.fontSize).toBe('16px')
    expect(span.style.fontFamily).toBe('monospace')
    expect(span.style.cursor).toBe('pointer')
  })
})
