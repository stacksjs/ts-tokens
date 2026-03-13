# Claude Code Guidelines

## About

ts-tokens is a TypeScript library, CLI, and component suite for managing fungible and non-fungible tokens on Solana. It supports SPL token creation/minting/transfer, NFT collection lifecycle management, Candy Machine drops with guards, and compressed NFTs via Merkle trees. The project includes React and Vue component packages (`@ts-tokens/react`, `@ts-tokens/vue`) and depends only on official Solana packages (`@solana/web3.js`, `@solana/spl-token`), implementing all program interactions via raw instructions.

## Linting

- Use **pickier** for linting — never use eslint directly
- Run `bunx --bun pickier .` to lint, `bunx --bun pickier . --fix` to auto-fix
- When fixing unused variable warnings, prefer `// eslint-disable-next-line` comments over prefixing with `_`

## Frontend

- Use **stx** for templating — never write vanilla JS (`var`, `document.*`, `window.*`) in stx templates
- Use **crosswind** as the default CSS framework which enables standard Tailwind-like utility classes
- stx `<script>` tags should only contain stx-compatible code (signals, composables, directives)

## Dependencies

- **buddy-bot** handles dependency updates — not renovatebot
- **better-dx** provides shared dev tooling as peer dependencies — do not install its peers (e.g., `typescript`, `pickier`, `bun-plugin-dtsx`) separately if `better-dx` is already in `package.json`
- If `better-dx` is in `package.json`, ensure `bunfig.toml` includes `linker = "hoisted"`

## Commits

- Use conventional commit messages (e.g., `fix:`, `feat:`, `chore:`)
