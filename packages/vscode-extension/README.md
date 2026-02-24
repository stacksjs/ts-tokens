# ts-tokens-vscode

VS Code extension for ts-tokens -- Solana token and NFT development. Provides code snippets, problem matchers, and workspace integration for ts-tokens projects.

## Installation

Install from the VS Code Marketplace by searching for **ts-tokens** (publisher: stacksjs), or install the `.vsix` file directly.

## Usage

The extension activates automatically when a workspace contains a `tokens.config.ts` or `tokens.config.js` file.

Once active, click the **ts-tokens** status bar item or open the command palette to access commands:

- **Create Token** -- `tokens token create`
- **Create NFT** -- `tokens nft create`
- **Create Collection** -- `tokens collection create`
- **Start Dev Validator** -- `tokens dev`
- **Upload to Storage** -- `tokens storage upload`
- **Show Config** -- `tokens config show`
- **Fix Error** -- `tokens fix <errorCode>`

## Features

- TypeScript and TSX code snippets for ts-tokens APIs
- Status bar indicator for ts-tokens workspaces
- Quick-pick command palette for common CLI operations
- Error code lookup and fix command
- Problem matchers for ts-tokens CLI output, transaction errors, and validation warnings
- Task definitions for running ts-tokens CLI commands
- Automatic detection of `tokens.config.ts` changes

## License

MIT
