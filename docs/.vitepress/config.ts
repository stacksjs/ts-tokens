import type { HeadConfig } from 'vitepress'
import { transformerTwoslash } from '@shikijs/vitepress-twoslash'
import { withPwa } from '@vite-pwa/vitepress'
import { defineConfig } from 'vitepress'
import vite from './vite.config'

// https://vitepress.dev/reference/site-config

const analyticsHead: HeadConfig[] = [
  [
    'script',
    {
      'src': 'https://cdn.usefathom.com/script.js',
      'data-site': 'PFISGDDM',
      'defer': '',
    },
  ],
]

const nav = [
  {
    text: 'v0.1.0',
    items: [
      { text: 'v0.1.0 (Latest)', link: '/' },
      { text: 'Changelog', link: 'https://github.com/stacksjs/tokens/blob/main/CHANGELOG.md' },
    ],
  },
  { text: 'News', link: 'https://stacksjs.org/news' },
  // { text: 'Blog', link: 'https://updates.ow3.org' },
  {
    text: 'Resources',
    items: [
      { text: 'Team', link: '/team' },
      { text: 'Showcase', link: '/showcase' },
      { text: 'Sponsors', link: '/sponsors' },
      { text: 'Partners', link: '/partners' },
      { text: 'Postcardware', link: '/postcardware' },
      { text: 'License', link: '/license' },
      {
        items: [
          {
            text: 'Awesome Stacks',
            link: 'https://github.com/stacksjs/awesome-stacks',
          },
          {
            text: 'Contributing',
            link: 'https://github.com/stacksjs/stacks/blob/main/.github/CONTRIBUTING.md',
          },
        ],
      },
    ],
  },
]

const sidebar = [
  {
    text: 'Get Started',
    items: [
      { text: 'Intro', link: '/intro' },
      { text: 'Install', link: '/install' },
      { text: 'Usage', link: '/usage' },
      { text: 'Config', link: '/config' },
    ],
  },
  {
    text: 'API',
    items: [
      {
        text: 'Tokens',
        collapsed: false,
        items: [
          { text: 'Create', link: '/api/tokens/create' },
          { text: 'Mint', link: '/api/tokens/mint' },
          { text: 'Transfer', link: '/api/tokens/transfer' },
          { text: 'Burn', link: '/api/tokens/burn' },
          { text: 'Metadata', link: '/api/tokens/metadata' },
          { text: 'Authority', link: '/api/tokens/authority' },
        ],
      },
      {
        text: 'NFTs',
        collapsed: false,
        items: [
          { text: 'Create', link: '/api/nft/create' },
          { text: 'Collections', link: '/api/nft/collection' },
          { text: 'Transfer', link: '/api/nft/transfer' },
          { text: 'Metadata', link: '/api/nft/metadata' },
          { text: 'Compressed NFTs', link: '/api/nft/compressed' },
        ],
      },
      {
        text: 'Candy Machine',
        collapsed: true,
        items: [
          { text: 'Create', link: '/api/candy-machine/create' },
          { text: 'Mint', link: '/api/candy-machine/mint' },
          { text: 'Guards', link: '/api/candy-machine/guards' },
          { text: 'Manage', link: '/api/candy-machine/manage' },
        ],
      },
      { text: 'Token 2022', link: '/api/token-2022/' },
      { text: 'Programmable NFTs', link: '/api/pnft/' },
      { text: 'DeFi', link: '/api/defi/' },
      { text: 'Staking', link: '/api/staking/' },
      { text: 'Governance', link: '/api/governance/' },
      { text: 'Marketplace', link: '/api/marketplace/' },
      { text: 'Multisig', link: '/api/multisig/' },
      { text: 'Treasury', link: '/api/treasury/' },
      { text: 'Wallets', link: '/api/wallets/' },
      { text: 'Batch Operations', link: '/api/batch/' },
      { text: 'Events', link: '/api/events/' },
      { text: 'Analytics', link: '/api/analytics/' },
      { text: 'Indexer', link: '/api/indexer/' },
      { text: 'Fluent API', link: '/api/fluent/' },
      { text: 'Voting', link: '/api/voting/' },
      { text: 'i18n', link: '/api/i18n/' },
      { text: 'Debug', link: '/api/debug/' },
    ],
  },
  { text: 'Showcase', link: '/showcase' },
]
const description = 'TypeScript toolkit for Solana tokens, NFTs, and DeFi. Zero dependencies beyond official Solana packages.'
const title = 'ts-tokens | Solana Token & NFT Toolkit'

export default withPwa(
  defineConfig({
    lang: 'en-US',
    title: 'ts-tokens',
    description,
    metaChunk: true,
    cleanUrls: true,
    lastUpdated: true,

    head: [
      ['link', { rel: 'icon', type: 'image/svg+xml', href: './images/logo-mini.svg' }],
      ['link', { rel: 'icon', type: 'image/png', href: './images/logo.png' }],
      ['meta', { name: 'theme-color', content: '#0A0ABC' }],
      ['meta', { name: 'title', content: title }],
      ['meta', { name: 'description', content: description }],
      ['meta', { name: 'author', content: 'Stacks.js, Inc.' }],
      ['meta', {
        name: 'tags',
        content: 'ts-tokens, typescript, solana, tokens, nft, defi, spl, metaplex, candy-machine, token-2022, web3, blockchain, stacksjs, stacks',
      }],

      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:locale', content: 'en' }],
      ['meta', { property: 'og:title', content: title }],
      ['meta', { property: 'og:description', content: description }],

      ['meta', { property: 'og:site_name', content: 'ts-tokens' }],
      ['meta', { property: 'og:image', content: 'https://ts-tokens.dev/images/og-image.png' }],
      ['meta', { property: 'og:url', content: 'https://ts-tokens.dev/' }],
      // ['script', { 'src': 'https://cdn.usefathom.com/script.js', 'data-site': '', 'data-spa': 'auto', 'defer': '' }],
      ...analyticsHead,
    ],

    themeConfig: {
      search: {
        provider: 'local',
      },
      logo: {
        light: './images/logo-transparent.svg',
        dark: './images/logo-white-transparent.svg',
      },

      nav,
      sidebar,

      editLink: {
        pattern: 'https://github.com/stacksjs/stacks/edit/main/docs/docs/:path',
        text: 'Edit this page on GitHub',
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025-present Stacks.js, Inc.',
      },

      socialLinks: [
        { icon: 'twitter', link: 'https://twitter.com/stacksjs' },
        { icon: 'bluesky', link: 'https://bsky.app/profile/chrisbreuer.dev' },
        { icon: 'github', link: 'https://github.com/stacksjs/tokens' },
        { icon: 'discord', link: 'https://discord.gg/stacksjs' },
      ],

      // Algolia DocSearch — uncomment and fill in credentials after applying at
      // https://docsearch.algolia.com/apply/ with your deployed docs URL
      // search: {
      //   provider: 'algolia',
      //   options: {
      //     appId: '<YOUR_ALGOLIA_APP_ID>',
      //     apiKey: '<YOUR_ALGOLIA_SEARCH_API_KEY>',
      //     indexName: 'ts-tokens',
      //   },
      // },

      // carbonAds: {
      //   code: '',
      //   placement: '',
      // },
    },

    pwa: {
      manifest: {
        theme_color: '#0A0ABC',
      },
    },

    markdown: {
      theme: {
        light: 'github-light',
        dark: 'github-dark',
      },

      codeTransformers: [
        transformerTwoslash(),
      ],
    },

    vite,
  }),
)
