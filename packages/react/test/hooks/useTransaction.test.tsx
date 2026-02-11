import { describe, test, expect, mock, afterEach } from 'bun:test'
import React from 'react'
import { render, act, cleanup } from '@testing-library/react'

const mockSendRawTransaction = mock(() => Promise.resolve('mocksig123abc456'))
const mockConfirmTransaction = mock(() => Promise.resolve({ value: { err: null } }))

// Mock the context module so useTransaction can call useConnection
// without requiring a real TokensProvider wrapper
mock.module('../../src/context', () => ({
  useConnection: () => ({
    sendRawTransaction: mockSendRawTransaction,
    confirmTransaction: mockConfirmTransaction,
  }),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { useTransaction } from '../../src/hooks/useTransaction'

/**
 * Test component that exposes useTransaction state and actions via DOM
 */
function TestComponent() {
  const { pending, signature, confirmed, error, send, reset } = useTransaction()

  const handleSend = async () => {
    try {
      await send(new Uint8Array([1, 2, 3]))
    } catch {
      // Error is captured in hook state
    }
  }

  return (
    <div>
      <span data-testid="pending">{String(pending)}</span>
      <span data-testid="signature">{signature || 'none'}</span>
      <span data-testid="confirmed">{String(confirmed)}</span>
      <span data-testid="error">{error?.message || 'none'}</span>
      <button data-testid="send" onClick={handleSend}>Send</button>
      <button data-testid="reset" onClick={reset}>Reset</button>
    </div>
  )
}

describe('useTransaction', () => {
  afterEach(() => {
    cleanup()
  })

  test('has correct initial state', () => {
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('pending').textContent).toBe('false')
    expect(getByTestId('signature').textContent).toBe('none')
    expect(getByTestId('confirmed').textContent).toBe('false')
    expect(getByTestId('error').textContent).toBe('none')
  })

  test('exposes send and reset functions', () => {
    const { getByTestId } = render(<TestComponent />)
    expect(getByTestId('send')).not.toBeNull()
    expect(getByTestId('reset')).not.toBeNull()
  })

  test('send updates state on successful transaction', async () => {
    const { getByTestId } = render(<TestComponent />)

    await act(async () => {
      getByTestId('send').click()
    })

    expect(getByTestId('pending').textContent).toBe('false')
    expect(getByTestId('signature').textContent).toBe('mocksig123abc456')
    expect(getByTestId('confirmed').textContent).toBe('true')
    expect(getByTestId('error').textContent).toBe('none')
  })

  test('reset clears all state', async () => {
    const { getByTestId } = render(<TestComponent />)

    // First, send a transaction
    await act(async () => {
      getByTestId('send').click()
    })

    // Verify state was set
    expect(getByTestId('signature').textContent).toBe('mocksig123abc456')

    // Reset
    act(() => {
      getByTestId('reset').click()
    })

    expect(getByTestId('pending').textContent).toBe('false')
    expect(getByTestId('signature').textContent).toBe('none')
    expect(getByTestId('confirmed').textContent).toBe('false')
    expect(getByTestId('error').textContent).toBe('none')
  })
})
