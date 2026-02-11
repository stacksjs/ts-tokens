import { describe, test, expect, mock } from 'bun:test'

const mockSendRaw = mock(() => Promise.resolve('mocksig123'))
const mockConfirm = mock(() => Promise.resolve({ value: { err: null } }))

mock.module('../../src/composables/useConnection', () => ({
  useConnection: () => ({
    sendRawTransaction: mockSendRaw,
    confirmTransaction: mockConfirm,
  }),
  useConfig: () => ({ network: 'devnet', rpcUrl: 'https://api.devnet.solana.com' }),
}))

import { useTransaction } from '../../src/composables/useTransaction'

describe('useTransaction', () => {
  test('initial state', () => {
    const { pending, signature, confirmed, error } = useTransaction()
    expect(pending.value).toBe(false)
    expect(signature.value).toBeNull()
    expect(confirmed.value).toBe(false)
    expect(error.value).toBeNull()
  })

  test('reset clears state', () => {
    const { signature, confirmed, error, pending, reset } = useTransaction()
    // Manually set some values
    signature.value = 'test'
    confirmed.value = true
    error.value = new Error('test error')
    pending.value = true
    reset()
    expect(signature.value).toBeNull()
    expect(confirmed.value).toBe(false)
    expect(error.value).toBeNull()
    expect(pending.value).toBe(false)
  })

  test('send calls sendRawTransaction and confirmTransaction', async () => {
    mockSendRaw.mockClear()
    mockConfirm.mockClear()

    const { send, signature, confirmed, pending, error } = useTransaction()
    const tx = new Uint8Array([1, 2, 3])
    const sig = await send(tx)

    expect(sig).toBe('mocksig123')
    expect(signature.value).toBe('mocksig123')
    expect(confirmed.value).toBe(true)
    expect(pending.value).toBe(false)
    expect(error.value).toBeNull()
    expect(mockSendRaw).toHaveBeenCalledWith(tx)
    expect(mockConfirm).toHaveBeenCalledWith('mocksig123', 'confirmed')
  })

  test('send sets error on failure', async () => {
    const failError = new Error('send failed')
    mockSendRaw.mockImplementationOnce(() => Promise.reject(failError))

    const { send, error, pending, confirmed } = useTransaction()
    const tx = new Uint8Array([1, 2, 3])

    try {
      await send(tx)
    } catch {
      // expected
    }

    expect(error.value).toBe(failError)
    expect(pending.value).toBe(false)
    expect(confirmed.value).toBe(false)
  })

  test('send sets error when transaction confirmation fails', async () => {
    mockSendRaw.mockClear()
    mockConfirm.mockImplementationOnce(() =>
      Promise.resolve({ value: { err: 'InstructionError' } }),
    )

    const { send, error, confirmed } = useTransaction()
    const tx = new Uint8Array([4, 5, 6])

    try {
      await send(tx)
    } catch {
      // expected
    }

    expect(error.value).toBeInstanceOf(Error)
    expect(error.value!.message).toContain('Transaction failed')
    expect(confirmed.value).toBe(false)
  })

  test('returns all expected properties', () => {
    const result = useTransaction()
    expect(result).toHaveProperty('pending')
    expect(result).toHaveProperty('signature')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('confirmed')
    expect(result).toHaveProperty('send')
    expect(result).toHaveProperty('reset')
    expect(typeof result.send).toBe('function')
    expect(typeof result.reset).toBe('function')
  })
})
