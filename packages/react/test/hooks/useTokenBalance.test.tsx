import { describe, test, expect, mock, afterEach } from 'bun:test'
import React from 'react'
import { render, cleanup, waitFor } from '@testing-library/react'
import * as splTokenActual from '@solana/spl-token'

// Use the REAL TokenAccountNotFoundError (thrown with an EMPTY message when the
// owner has no ATA) so the hook's `instanceof` check is exercised faithfully.
const { TokenAccountNotFoundError } = splTokenActual

const mockGetAccount = mock(async () => {
  throw new TokenAccountNotFoundError()
})

// IMPORTANT: bun's mock.module is process-global and persists across files.
// Spread the real module so we only override the two functions this test needs
// and don't strip every other spl-token export from unrelated test files.
mock.module('@solana/spl-token', () => ({
  ...splTokenActual,
  getAssociatedTokenAddress: async () => ({ toBase58: () => 'ata' }),
  getAccount: mockGetAccount,
}))

mock.module('../../src/context', () => ({
  useConnection: () => ({
    getParsedAccountInfo: async () => ({
      value: { data: { parsed: { info: { decimals: 6 } } } },
    }),
  }),
}))

// Do NOT mock @solana/web3.js — a global PublicKey stub corrupts PDA derivation
// in every later test file. Pass valid base58 addresses instead.
const MINT = 'So11111111111111111111111111111111111111112'
const OWNER = '11111111111111111111111111111111'

import { useTokenBalance } from '../../src/hooks/useTokenBalance'

function TestComponent({ mint, owner }: { mint: string; owner?: string }) {
  const { balance, decimals, loading, error } = useTokenBalance(mint, owner)
  return (
    <div>
      <span data-testid="balance">{balance.toString()}</span>
      <span data-testid="decimals">{String(decimals)}</span>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="error">{error?.name ?? 'none'}</span>
    </div>
  )
}

describe('useTokenBalance', () => {
  afterEach(() => cleanup())

  test('returns balance 0 (not an error) when the ATA does not exist yet', async () => {
    const { getByTestId } = render(<TestComponent mint={MINT} owner={OWNER} />)

    await waitFor(() => {
      expect(getByTestId('loading').textContent).toBe('false')
    })

    expect(getByTestId('balance').textContent).toBe('0')
    expect(getByTestId('error').textContent).toBe('none')
    // Decimals are still fetched from the mint even without an ATA.
    expect(getByTestId('decimals').textContent).toBe('6')
  })
})
