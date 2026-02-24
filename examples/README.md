# ts-tokens Examples

Example projects demonstrating how to use **ts-tokens** for various Solana token and NFT workflows.

## Examples

| Example | Description | Stack |
|---------|-------------|-------|
| [create-token](./create-token/) | Create a fungible SPL token | TypeScript script |
| [nft-collection](./nft-collection/) | Create an NFT collection and mint items | TypeScript script |
| [token-airdrop](./token-airdrop/) | Airdrop tokens to a CSV list of recipients | TypeScript script |
| [cli-scripts](./cli-scripts/) | Shell scripts for batch minting and Candy Machine setup | Bash + CLI |
| [nft-minting-site](./nft-minting-site/) | Browser app for minting NFTs with a connected wallet | React + Vite |
| [candy-machine-ui](./candy-machine-ui/) | Create and mint from Candy Machines in the browser | React + Vite |
| [vue-nft-gallery](./vue-nft-gallery/) | Browse NFTs owned by a wallet in a responsive gallery | Vue 3 + Vite |

## Getting Started

Each example is a standalone project. Navigate into any directory and install dependencies:

```bash
cd examples/<example-name>
bun install
```

### Script examples

```bash
bun run index.ts
```

### Web app examples

```bash
bun dev
```

Then open [<http://localhost:517>3](http://localhost:5173) in your browser.

## Try Online

The web app examples can be opened directly in StackBlitz:

- [nft-minting-site](https://stackblitz.com/github/stacksjs/ts-tokens/tree/main/examples/nft-minting-site)
- [candy-machine-ui](https://stackblitz.com/github/stacksjs/ts-tokens/tree/main/examples/candy-machine-ui)
- [vue-nft-gallery](https://stackblitz.com/github/stacksjs/ts-tokens/tree/main/examples/vue-nft-gallery)

## Notes

- All web examples default to **Solana devnet**. Switch to mainnet-beta in your config for production.
- Wallet adapters require a browser extension (e.g. Phantom) to be installed.
- See the main [ts-tokens README](../packages/ts-tokens/README.md) for full API documentation.
