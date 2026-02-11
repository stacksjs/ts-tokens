import React from 'react'
import type { Preview } from '@storybook/react'
import { TokensProvider } from '../src/context'

const preview: Preview = {
  decorators: [
    (Story) => (
      <TokensProvider endpoint="https://api.devnet.solana.com">
        <Story />
      </TokensProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
