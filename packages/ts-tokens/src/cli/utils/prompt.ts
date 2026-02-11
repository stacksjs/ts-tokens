/**
 * CLI Prompt Utilities
 *
 * Inquirer-based interactive prompt helpers.
 */

import { input, confirm, select, password, number } from '@inquirer/prompts'

/**
 * Prompt for text input
 */
export async function promptText(message: string, defaultValue?: string): Promise<string> {
  return input({ message, default: defaultValue })
}

/**
 * Prompt for yes/no confirmation
 */
export async function promptConfirm(message: string, defaultValue = true): Promise<boolean> {
  return confirm({ message, default: defaultValue })
}

/**
 * Prompt to select from a list of choices
 */
export async function promptSelect<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; description?: string }>
): Promise<T> {
  return select({ message, choices })
}

/**
 * Prompt for secret/password input (masked)
 */
export async function promptSecret(message: string): Promise<string> {
  return password({ message, mask: '*' })
}

/**
 * Prompt for a numeric value
 */
export async function promptNumber(message: string, defaultValue?: number): Promise<number> {
  const result = await number({ message, default: defaultValue })
  return result ?? defaultValue ?? 0
}

/**
 * Prompt to select multiple items from a list
 */
export async function promptMultiSelect<T extends string>(
  message: string,
  choices: Array<{ name: string; value: T; checked?: boolean }>
): Promise<T[]> {
  const { checkbox } = await import('@inquirer/prompts')
  return checkbox({ message, choices })
}
