import type { BunPressConfig } from 'bunpress'

const config: BunPressConfig = {
  name: 'ts-tokens',
  description: 'Generate fungible or non-fungible tokens on Solana',
  url: 'https://ts-tokens.stacksjs.org',

  theme: {
    primaryColor: '#14b8a6',
  },

  sidebar: [
    {
      text: 'Introduction',
      link: '/',
    },
    {
      text: 'Guide',
      items: [
        { text: 'Getting Started', link: '/guide/getting-started' },
        { text: 'Fungible Tokens', link: '/guide/fungible' },
        { text: 'NFTs', link: '/guide/nft' },
      ],
    },
    {
      text: 'Features',
      items: [
        { text: 'Token Metadata', link: '/features/metadata' },
        { text: 'Minting', link: '/features/minting' },
        { text: 'Transfers', link: '/features/transfers' },
        { text: 'Collections', link: '/features/collections' },
      ],
    },
    {
      text: 'Advanced',
      items: [
        { text: 'Custom Programs', link: '/advanced/programs' },
        { text: 'Token Extensions', link: '/advanced/extensions' },
        { text: 'Compressed NFTs', link: '/advanced/compressed' },
        { text: 'Batch Operations', link: '/advanced/batch' },
      ],
    },
  ],

  navbar: [
    { text: 'Home', link: '/' },
    { text: 'Guide', link: '/guide/getting-started' },
    { text: 'GitHub', link: 'https://github.com/stacksjs/ts-tokens' },
  ],

  socialLinks: [
    { icon: 'github', link: 'https://github.com/stacksjs/ts-tokens' },
    { icon: 'discord', link: 'https://discord.gg/stacksjs' },
    { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
  ],
}

export default config
