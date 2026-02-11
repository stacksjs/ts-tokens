import { describe, test, expect, mock, beforeEach } from 'bun:test'

const mockGetAccount = mock(() =>
  Promise.resolve({
    amount: 1000000000n,
    mint: 'So11111111111111111111111111111111111111112',
    owner: 'owner123',
  }),
)

const mockGetAssociatedTokenAddress = mock(() =>
  Promise.resolve('ata-address-mock'),
)

const mockGetParsedAccountInfo = mock(() =>
  Promise.resolve({
    value: {
      data: {
        parsed: {
          info: {
            decimals: 9,
          },
        },
      },
    },
  }),
)

// Mock @solana/spl-token
mock.module('@solana/spl-token', () => ({
  getAssociatedTokenAddress: mockGetAssociatedTokenAddress,
  getAccount: mockGetAccount,
}))

// Mock useConnection to return a mock connection object
mock.module('../../src/composables/useConnection', () => ({
  useConnection: () => ({
    sendRawTransaction: mock(),
    confirmTransaction: mock(),
    getParsedAccountInfo: mockGetParsedAccountInfo,
  }),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { useTokenBalance } from '../../src/composables/useTokenBalance'

const TEST_MINT = 'So11111111111111111111111111111111111111112'
const TEST_OWNER = 'DRpbCBMxVnDK7maPMoGu4oXAoC2cZ5Z5f4LhNvvPZb3'

describe('useTokenBalance', () => {
  beforeEach(() => {
    mockGetAccount.mockClear()
    mockGetAssociatedTokenAddress.mockClear()
    mockGetParsedAccountInfo.mockClear()
  })

  test('initial state has loading true and balance 0n', () => {
    const { balance, loading, error, decimals, uiBalance } = useTokenBalance(TEST_MINT, TEST_OWNER)
    expect(loading.value).toBe(true)
    expect(balance.value).toBe(0n)
    expect(decimals.value).toBe(0)
    expect(uiBalance.value).toBe(0)
    expect(error.value).toBeNull()
  })

  test('returns all expected properties', () => {
    const result = useTokenBalance(TEST_MINT, TEST_OWNER)
    expect(result).toHaveProperty('balance')
    expect(result).toHaveProperty('uiBalance')
    expect(result).toHaveProperty('decimals')
    expect(result).toHaveProperty('loading')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('refetch')
    expect(typeof result.refetch).toBe('function')
  })

  test('refetch updates balance after successful fetch', async () => {
    const { balance, loading, error, uiBalance, decimals, refetch } = useTokenBalance(
      TEST_MINT,
      TEST_OWNER,
    )

    await refetch()

    expect(loading.value).toBe(false)
    expect(balance.value).toBe(1000000000n)
    expect(decimals.value).toBe(9)
    expect(uiBalance.value).toBe(1)
    expect(error.value).toBeNull()
  })

  test('refetch sets error on failure', async () => {
    mockGetAccount.mockImplementationOnce(() =>
      Promise.reject(new Error('network error')),
    )

    const { error, loading, refetch } = useTokenBalance(TEST_MINT, TEST_OWNER)

    await refetch()

    expect(loading.value).toBe(false)
    expect(error.value).toBeInstanceOf(Error)
    expect(error.value!.message).toBe('network error')
  })

  test('refetch handles account-not-found by setting balance to 0', async () => {
    mockGetAccount.mockImplementationOnce(() =>
      Promise.reject(new Error('could not find account')),
    )

    const { balance, uiBalance, error, loading, refetch } = useTokenBalance(
      TEST_MINT,
      TEST_OWNER,
    )

    await refetch()

    expect(loading.value).toBe(false)
    expect(balance.value).toBe(0n)
    expect(uiBalance.value).toBe(0)
    expect(error.value).toBeNull()
  })

  test('handles empty owner string by not fetching', async () => {
    const { loading, refetch } = useTokenBalance(TEST_MINT, '')

    await refetch()

    expect(loading.value).toBe(false)
    expect(mockGetAccount).not.toHaveBeenCalled()
  })
})
