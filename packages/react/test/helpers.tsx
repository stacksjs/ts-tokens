/**
 * Shared test helpers
 *
 * Utility functions for rendering components in tests.
 * Pure display components (WalletAddress, AddressDisplay, SolAmount, ExplorerLink)
 * do not require a provider and can be rendered directly.
 *
 * Components that depend on context (NFTCard, TokenBalance, etc.) should mock
 * the relevant hook/context modules instead of wrapping with TokensProvider,
 * since TokensProvider creates a real Connection internally.
 */

import React from 'react'
import { render, type RenderOptions } from '@testing-library/react'

/**
 * Render a component for testing.
 * For pure display components, no wrapper is needed.
 */
export function renderComponent(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, options)
}
