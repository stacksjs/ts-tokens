/**
 * CLI Prompt Utils — Unit Tests
 *
 * Mocks `@inquirer/prompts` and verifies that each prompt wrapper
 * delegates to the correct Inquirer function with the expected options.
 */

import { describe, test, expect, mock, beforeEach } from 'bun:test'

// ---------------------------------------------------------------------------
// Mock @inquirer/prompts before importing the prompt utilities
// ---------------------------------------------------------------------------

const mockInput = mock(() => Promise.resolve('test answer'))
const mockConfirm = mock(() => Promise.resolve(true))
const mockSelect = mock(() => Promise.resolve('option1'))
const mockPassword = mock(() => Promise.resolve('secret123'))
const mockNumber = mock(() => Promise.resolve(42))
const mockCheckbox = mock(() => Promise.resolve(['a', 'b']))

mock.module('@inquirer/prompts', () => ({
  input: mockInput,
  confirm: mockConfirm,
  select: mockSelect,
  password: mockPassword,
  number: mockNumber,
  checkbox: mockCheckbox,
}))

import {
  promptText,
  promptConfirm,
  promptSelect,
  promptSecret,
  promptNumber,
  promptMultiSelect,
} from '../../src/cli/utils/prompt'

// ---------------------------------------------------------------------------
// Reset mocks between tests so call counts stay isolated
// ---------------------------------------------------------------------------

beforeEach(() => {
  mockInput.mockClear()
  mockConfirm.mockClear()
  mockSelect.mockClear()
  mockPassword.mockClear()
  mockNumber.mockClear()
  mockCheckbox.mockClear()
})

// ---------------------------------------------------------------------------
// 1. promptText
// ---------------------------------------------------------------------------

describe('promptText', () => {
  test('calls input with message and returns the result', async () => {
    const result = await promptText('Enter name')
    expect(result).toBe('test answer')
    expect(mockInput).toHaveBeenCalledTimes(1)
    expect(mockInput).toHaveBeenCalledWith({ message: 'Enter name', default: undefined })
  })

  test('passes defaultValue to input', async () => {
    await promptText('Enter name', 'Alice')
    expect(mockInput).toHaveBeenCalledWith({ message: 'Enter name', default: 'Alice' })
  })
})

// ---------------------------------------------------------------------------
// 2. promptConfirm
// ---------------------------------------------------------------------------

describe('promptConfirm', () => {
  test('calls confirm with message and returns boolean', async () => {
    const result = await promptConfirm('Are you sure?')
    expect(result).toBe(true)
    expect(mockConfirm).toHaveBeenCalledTimes(1)
    // defaultValue defaults to true when not provided
    expect(mockConfirm).toHaveBeenCalledWith({ message: 'Are you sure?', default: true })
  })

  test('passes explicit defaultValue to confirm', async () => {
    await promptConfirm('Continue?', false)
    expect(mockConfirm).toHaveBeenCalledWith({ message: 'Continue?', default: false })
  })
})

// ---------------------------------------------------------------------------
// 3. promptSelect
// ---------------------------------------------------------------------------

describe('promptSelect', () => {
  test('calls select with message and choices', async () => {
    const choices = [
      { name: 'Option 1', value: 'option1' as const },
      { name: 'Option 2', value: 'option2' as const },
    ]
    const result = await promptSelect('Choose one', choices)
    expect(result).toBe('option1')
    expect(mockSelect).toHaveBeenCalledTimes(1)
    expect(mockSelect).toHaveBeenCalledWith({ message: 'Choose one', choices })
  })

  test('supports choices with description field', async () => {
    const choices = [
      { name: 'Mainnet', value: 'mainnet-beta' as const, description: 'Production network' },
    ]
    await promptSelect('Select network', choices)
    expect(mockSelect).toHaveBeenCalledWith({ message: 'Select network', choices })
  })
})

// ---------------------------------------------------------------------------
// 4. promptSecret
// ---------------------------------------------------------------------------

describe('promptSecret', () => {
  test('calls password with message and mask', async () => {
    const result = await promptSecret('Enter password')
    expect(result).toBe('secret123')
    expect(mockPassword).toHaveBeenCalledTimes(1)
    expect(mockPassword).toHaveBeenCalledWith({ message: 'Enter password', mask: '*' })
  })
})

// ---------------------------------------------------------------------------
// 5. promptNumber
// ---------------------------------------------------------------------------

describe('promptNumber', () => {
  test('calls number with message and returns numeric result', async () => {
    const result = await promptNumber('Enter count')
    expect(result).toBe(42)
    expect(mockNumber).toHaveBeenCalledTimes(1)
    expect(mockNumber).toHaveBeenCalledWith({ message: 'Enter count', default: undefined })
  })

  test('passes defaultValue to number', async () => {
    await promptNumber('Enter count', 10)
    expect(mockNumber).toHaveBeenCalledWith({ message: 'Enter count', default: 10 })
  })

  test('falls back to defaultValue when number returns undefined', async () => {
    mockNumber.mockImplementationOnce(() => Promise.resolve(undefined))
    const result = await promptNumber('Enter count', 7)
    expect(result).toBe(7)
  })

  test('falls back to 0 when both result and defaultValue are undefined', async () => {
    mockNumber.mockImplementationOnce(() => Promise.resolve(undefined))
    const result = await promptNumber('Enter count')
    expect(result).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// 6. promptMultiSelect
// ---------------------------------------------------------------------------

describe('promptMultiSelect', () => {
  test('calls checkbox with message and choices', async () => {
    const choices = [
      { name: 'A', value: 'a' as const },
      { name: 'B', value: 'b' as const },
    ]
    const result = await promptMultiSelect('Select items', choices)
    expect(result).toEqual(['a', 'b'])
    expect(mockCheckbox).toHaveBeenCalledTimes(1)
    expect(mockCheckbox).toHaveBeenCalledWith({ message: 'Select items', choices })
  })

  test('supports choices with checked field', async () => {
    const choices = [
      { name: 'A', value: 'a' as const, checked: true },
      { name: 'B', value: 'b' as const, checked: false },
    ]
    await promptMultiSelect('Select items', choices)
    expect(mockCheckbox).toHaveBeenCalledWith({ message: 'Select items', choices })
  })
})
