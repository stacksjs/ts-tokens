# Changelog

All notable changes to ts-tokens are documented here, generated from the git history by [logsmith](https://github.com/stacksjs/logsmith). For release artifacts see [GitHub releases](https://github.com/stacksjs/ts-tokens/releases).

## Unreleased

## 🚀 Features

- **testing**: support --keypair for faucet-free dress rehearsals with a funded wallet ([5081b8f](https://github.com/stacksjs/ts-tokens/commit/5081b8f)) _(by Chris <chrisbreuer93@gmail.com>)_
- **testing**: add programmatic airdrop and NFT-drop dress-rehearsal harness + CLI ([6dac63d](https://github.com/stacksjs/ts-tokens/commit/6dac63d)) _(by Chris <chrisbreuer93@gmail.com>)_
- Votes SDK Facade (ts-governance) ([4460b9f](https://github.com/stacksjs/ts-tokens/commit/4460b9f)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- DAO Governance Package (ts-governance) ([44b2f20](https://github.com/stacksjs/ts-tokens/commit/44b2f20)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Programmable NFTs (pNFTs) Program Layer ([a3a1ea0](https://github.com/stacksjs/ts-tokens/commit/a3a1ea0)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Multi-Sig Authority Support ([a9367c1](https://github.com/stacksjs/ts-tokens/commit/a9367c1)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Staking & Token Locking ([b8ffba9](https://github.com/stacksjs/ts-tokens/commit/b8ffba9)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Simple NFT Standard ([532bfe5](https://github.com/stacksjs/ts-tokens/commit/532bfe5)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Migration & Compatibility Tools ([78fb733](https://github.com/stacksjs/ts-tokens/commit/78fb733)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Foundation completion, developer experience, docs cleanup ([2c1f598](https://github.com/stacksjs/ts-tokens/commit/2c1f598)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Performance optimization, accessibility, ecosystem integrations ([53dbf36](https://github.com/stacksjs/ts-tokens/commit/53dbf36)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Security completion, React & Vue component expansion ([e455c62](https://github.com/stacksjs/ts-tokens/commit/e455c62)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Testing & QA — React, Vue, CLI tests, E2E setup ([cc6a449](https://github.com/stacksjs/ts-tokens/commit/cc6a449)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Optimizations ([6d0a4bd](https://github.com/stacksjs/ts-tokens/commit/6d0a4bd)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Browser wallet adapters, NFT gaps, CLI utils, example apps ([7ab4827](https://github.com/stacksjs/ts-tokens/commit/7ab4827)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Security & Best Practices ([10de5aa](https://github.com/stacksjs/ts-tokens/commit/10de5aa)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- RPC rate limiting, collection management ([8514dab](https://github.com/stacksjs/ts-tokens/commit/8514dab)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Refactor cli commands ([60161c4](https://github.com/stacksjs/ts-tokens/commit/60161c4)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_

## 🐛 Bug Fixes

- **defi,vesting,fanout,multisig,staking**: decimals, double-claim, real guards ([f585a25](https://github.com/stacksjs/ts-tokens/commit/f585a25)) _(by Chris <chrisbreuer93@gmail.com>)_
- **marketplace,compressed-token,pnft**: stop faking listings, proofs, rules ([eb6b98a](https://github.com/stacksjs/ts-tokens/commit/eb6b98a)) _(by Chris <chrisbreuer93@gmail.com>)_
- **batch,fluent,events,analytics**: stop fabricating results ([dfd179b](https://github.com/stacksjs/ts-tokens/commit/dfd179b)) _(by Chris <chrisbreuer93@gmail.com>)_
- **batch**: batchTransfer no longer fakes success ([da34f88](https://github.com/stacksjs/ts-tokens/commit/da34f88)) _(by Chris <chrisbreuer93@gmail.com>)_
- **indexer,i18n,debug,storage**: propagate errors, honest locales, v0 txns ([4ca70f8](https://github.com/stacksjs/ts-tokens/commit/4ca70f8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **legacy,simple-nft,nft**: honest metadata parsing, holders, editions ([11bc13d](https://github.com/stacksjs/ts-tokens/commit/11bc13d)) _(by Chris <chrisbreuer93@gmail.com>)_
- **utils**: precision, secure seeds, real base58check; drop dead modules ([bf3f7af](https://github.com/stacksjs/ts-tokens/commit/bf3f7af)) _(by Chris <chrisbreuer93@gmail.com>)_
- **drivers**: make the Solana driver Token-2022 aware; real send retry ([3651dbf](https://github.com/stacksjs/ts-tokens/commit/3651dbf)) _(by Chris <chrisbreuer93@gmail.com>)_
- **cli**: real fee withdrawal, config persistence, register ~48 commands ([8c37f5a](https://github.com/stacksjs/ts-tokens/commit/8c37f5a)) _(by Chris <chrisbreuer93@gmail.com>)_
- **security**: read a token's creation slot for the age check ([2b2949a](https://github.com/stacksjs/ts-tokens/commit/2b2949a)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft,defi,bubblegum**: correct query offsets, Orca layout; honest decompress ([04058d1](https://github.com/stacksjs/ts-tokens/commit/04058d1)) _(by Chris <chrisbreuer93@gmail.com>)_
- **mpl-core**: correct instruction discriminators, arg layouts, account orders ([ea194c8](https://github.com/stacksjs/ts-tokens/commit/ea194c8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **governance,voting**: honest errors and real token-weight parsing ([6363461](https://github.com/stacksjs/ts-tokens/commit/6363461)) _(by Chris <chrisbreuer93@gmail.com>)_
- **vue**: replace React-adapter wallet, real candy data, reactive composables ([9819f88](https://github.com/stacksjs/ts-tokens/commit/9819f88)) _(by Chris <chrisbreuer93@gmail.com>)_
- **react**: real wallet/candy-machine data, honest governance, hook correctness ([6bee8e8](https://github.com/stacksjs/ts-tokens/commit/6bee8e8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **ts-governance**: throw honestly instead of fabricating governance results ([f4bfdd6](https://github.com/stacksjs/ts-tokens/commit/f4bfdd6)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token-2022,security,debug**: correct SPL/Token-2022 byte layouts ([f8333fb](https://github.com/stacksjs/ts-tokens/commit/f8333fb)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft,batch**: merge metadata updates instead of wiping untouched fields ([0b0a79b](https://github.com/stacksjs/ts-tokens/commit/0b0a79b)) _(by Chris <chrisbreuer93@gmail.com>)_
- **marketplace,defi,treasury**: stop fund-loss in settlement and staking paths ([65d267f](https://github.com/stacksjs/ts-tokens/commit/65d267f)) _(by Chris <chrisbreuer93@gmail.com>)_
- **treasury**: throw from createSpendingProposal and closeEmptyTokenAccount instead of faking success ([aa2df32](https://github.com/stacksjs/ts-tokens/commit/aa2df32)) _(by Chris <chrisbreuer93@gmail.com>)_
- **multisig**: implement real multisig creation and treasury transfers, throw instead of faking success ([e182a34](https://github.com/stacksjs/ts-tokens/commit/e182a34)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: rebuild candy machine initialize/mint/guard instructions against real interfaces ([d27ab16](https://github.com/stacksjs/ts-tokens/commit/d27ab16)) _(by Chris <chrisbreuer93@gmail.com>)_
- **staking**: decimal-aware APR, exact bigint liquid conversions, lock-aware penalty, honest errors ([cbb8ad6](https://github.com/stacksjs/ts-tokens/commit/cbb8ad6)) _(by Chris <chrisbreuer93@gmail.com>)_
- **governance**: correct System/SPL-Token proposal actions and vote-power math ([cfdccc8](https://github.com/stacksjs/ts-tokens/commit/cfdccc8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: correct compressed transfer/burn discriminators, DAS proof data, and tree sizing ([5abf5a4](https://github.com/stacksjs/ts-tokens/commit/5abf5a4)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: detect Token-2022 from account owner instead of dead tlvData check ([c21f028](https://github.com/stacksjs/ts-tokens/commit/c21f028)) _(by Chris <chrisbreuer93@gmail.com>)_
- **vesting**: persist escrow keypair and sign claims so vested funds are claimable ([f5e3e1f](https://github.com/stacksjs/ts-tokens/commit/f5e3e1f)) _(by Chris <chrisbreuer93@gmail.com>)_
- **distribution**: reload state after funding links so campaign updates don't revert them ([5fe3c56](https://github.com/stacksjs/ts-tokens/commit/5fe3c56)) _(by Chris <chrisbreuer93@gmail.com>)_
- **fanout**: guard zero-amount distribution, assign rounding remainder, validate shares ([3bd27d2](https://github.com/stacksjs/ts-tokens/commit/3bd27d2)) _(by Chris <chrisbreuer93@gmail.com>)_
- **vesting**: clamp day-of-month when adding months so cliff and end dates are correct ([8300da5](https://github.com/stacksjs/ts-tokens/commit/8300da5)) _(by Chris <chrisbreuer93@gmail.com>)_
- **governance**: convert relative delegation expiry to an absolute timestamp ([91a0577](https://github.com/stacksjs/ts-tokens/commit/91a0577)) _(by Chris <chrisbreuer93@gmail.com>)_
- **governance**: compare quorum and approval by cross-multiplication and treat abstain as neutral ([0386e6d](https://github.com/stacksjs/ts-tokens/commit/0386e6d)) _(by Chris <chrisbreuer93@gmail.com>)_
- **staking**: replace ESM-incompatible require with top-level import in nft rewards ([5d644d8](https://github.com/stacksjs/ts-tokens/commit/5d644d8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: harvest fees from all extension-bearing accounts and withdraw from mint ([bb518a2](https://github.com/stacksjs/ts-tokens/commit/bb518a2)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: correct confidential-transfer and token-group extension sizes ([3e6404a](https://github.com/stacksjs/ts-tokens/commit/3e6404a)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: route transfer-fee and interest-rate updates through correct token-2022 opcodes ([3c95474](https://github.com/stacksjs/ts-tokens/commit/3c95474)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: correct embedded metadata initialize discriminator and Field enum encoding ([d4da325](https://github.com/stacksjs/ts-tokens/commit/d4da325)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: correct token group interface discriminators and instruction layouts ([559b85f](https://github.com/stacksjs/ts-tokens/commit/559b85f)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: mint compressed NFTs via canonical bubblegum builders with real leaf index ([2efe1d8](https://github.com/stacksjs/ts-tokens/commit/2efe1d8)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: create associated token accounts idempotently to avoid races and duplicate recipients ([9e21893](https://github.com/stacksjs/ts-tokens/commit/9e21893)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: read candy machine config lines and taken bitmask at on-chain offsets ([336f01d](https://github.com/stacksjs/ts-tokens/commit/336f01d)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: size candy machine account with on-chain hidden section and config-line space ([1584949](https://github.com/stacksjs/ts-tokens/commit/1584949)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: correct candy guard initialize/update/wrap/unwrap discriminators ([b789cf6](https://github.com/stacksjs/ts-tokens/commit/b789cf6)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: read candy machine features as [u8;6] to keep field offsets aligned ([39190f9](https://github.com/stacksjs/ts-tokens/commit/39190f9)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: parse token-2022 TLV from padded offset and keep zero-length extensions ([66889fe](https://github.com/stacksjs/ts-tokens/commit/66889fe)) _(by Chris <chrisbreuer93@gmail.com>)_
- **utils**: track token account mints so invalidateMint actually evicts them ([5ca2bdb](https://github.com/stacksjs/ts-tokens/commit/5ca2bdb)) _(by Chris <chrisbreuer93@gmail.com>)_
- **drivers**: key wallet cache by keypair source instead of first load ([cd8e869](https://github.com/stacksjs/ts-tokens/commit/cd8e869)) _(by Chris <chrisbreuer93@gmail.com>)_
- **drivers**: confirm versioned transactions with real blockhash and block height ([4129182](https://github.com/stacksjs/ts-tokens/commit/4129182)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: derive tree config PDA under the bubblegum program ([a224867](https://github.com/stacksjs/ts-tokens/commit/a224867)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: correct bubblegum cancel_redeem discriminator ([e4e1857](https://github.com/stacksjs/ts-tokens/commit/e4e1857)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token**: use single-byte discriminator for CreateMetadataAccountV3 ([c4a3083](https://github.com/stacksjs/ts-tokens/commit/c4a3083)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: correct edition key classification and parent filter in edition queries ([8a62f50](https://github.com/stacksjs/ts-tokens/commit/8a62f50)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: parse collection and uses at metadata level, not inside Data struct ([d9885dd](https://github.com/stacksjs/ts-tokens/commit/d9885dd)) _(by Chris <chrisbreuer93@gmail.com>)_
- **programs**: use SignMetadata discriminator for creator verification ([97f0eb3](https://github.com/stacksjs/ts-tokens/commit/97f0eb3)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: let BurnNft handle token burn and account closure in burnNFTFull ([dc93c83](https://github.com/stacksjs/ts-tokens/commit/dc93c83)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: correct master edition maxSupply option encoding and unlimited-supply default ([f7f08d9](https://github.com/stacksjs/ts-tokens/commit/f7f08d9)) _(by Chris <chrisbreuer93@gmail.com>)_
- **nft**: serialize collection verified flag before key in metadata args ([b4f1504](https://github.com/stacksjs/ts-tokens/commit/b4f1504)) _(by Chris <chrisbreuer93@gmail.com>)_
- **storage**: sign shadow-drive requests instead of sending the secret key ([de9f7e3](https://github.com/stacksjs/ts-tokens/commit/de9f7e3)) _(by Chris <chrisbreuer93@gmail.com>)_
- **build**: exit non-zero when any bundle fails to build ([7b6c4a0](https://github.com/stacksjs/ts-tokens/commit/7b6c4a0)) _(by Chris <chrisbreuer93@gmail.com>)_
- **tsconfig**: exclude pantry directory so typecheck passes ([c198d33](https://github.com/stacksjs/ts-tokens/commit/c198d33)) _(by Chris <chrisbreuer93@gmail.com>)_
- **scripts**: exclude pantry vendor tests from bun test sweep ([32e10df](https://github.com/stacksjs/ts-tokens/commit/32e10df)) _(by Chris <chrisbreuer93@gmail.com>)_
- **scripts**: stop double-generating CHANGELOG on release ([c9d0a44](https://github.com/stacksjs/ts-tokens/commit/c9d0a44)) _(by Glenn Michael Torregosa <gtorregosa@gmail.com>)_
- add setup-bun to publish-commit job ([5bcfd44](https://github.com/stacksjs/ts-tokens/commit/5bcfd44)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- chain pantry publish:commit calls for single-arg CLI ([aa56f1f](https://github.com/stacksjs/ts-tokens/commit/aa56f1f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- resolve remaining TypeScript errors for clean typecheck ([f425500](https://github.com/stacksjs/ts-tokens/commit/f425500)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- resolve TypeScript errors for open source release ([6302fa8](https://github.com/stacksjs/ts-tokens/commit/6302fa8)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_

## 🧪 Tests

- **candy**: add byte-level coverage for candy machine and guard instructions ([8e35d91](https://github.com/stacksjs/ts-tokens/commit/8e35d91)) _(by Chris <chrisbreuer93@gmail.com>)_
- **governance**: assert delegation expiry is an absolute timestamp ([d8c7e83](https://github.com/stacksjs/ts-tokens/commit/d8c7e83)) _(by Chris <chrisbreuer93@gmail.com>)_
- **token-2022**: assert extension-prefixed opcodes for transfer-fee instructions ([9795c6b](https://github.com/stacksjs/ts-tokens/commit/9795c6b)) _(by Chris <chrisbreuer93@gmail.com>)_
- **cli**: expect exit 1 and error message for unknown commands ([27ac559](https://github.com/stacksjs/ts-tokens/commit/27ac559)) _(by Chris <chrisbreuer93@gmail.com>)_
- Fix failing test case ([f67dbe4](https://github.com/stacksjs/ts-tokens/commit/f67dbe4)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Migration & Compatibility test ([fe722a7](https://github.com/stacksjs/ts-tokens/commit/fe722a7)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Additional Testing & Quality Assurance ([7f0279f](https://github.com/stacksjs/ts-tokens/commit/7f0279f)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Security test ([935e721](https://github.com/stacksjs/ts-tokens/commit/935e721)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Comprehensive test case for current updates ([9c50678](https://github.com/stacksjs/ts-tokens/commit/9c50678)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_

## 🤖 Continuous Integration

- drop redundant setup-bun (pantry installs bun via deps.yaml) ([7a4c157](https://github.com/stacksjs/ts-tokens/commit/7a4c157)) _(by glennmichael123 <gtorregosa@gmail.com>)_

## 🧹 Chores

- wip ([4ce7587](https://github.com/stacksjs/ts-tokens/commit/4ce7587)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update dependency typescript to v7 (#2066) ([9885660](https://github.com/stacksjs/ts-tokens/commit/9885660)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#2066](https://github.com/stacksjs/ts-tokens/issues/2066), [#2066](https://github.com/stacksjs/ts-tokens/issues/2066))
- **deps**: declare bun ^1.3.14 in deps.yaml ([6837211](https://github.com/stacksjs/ts-tokens/commit/6837211)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.37 ([9b3e96e](https://github.com/stacksjs/ts-tokens/commit/9b3e96e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **build,config**: fix packaging, exports, engines, e2e, example deps ([2969fb0](https://github.com/stacksjs/ts-tokens/commit/2969fb0)) _(by Chris <chrisbreuer93@gmail.com>)_
- add some docs ([38fe0ec](https://github.com/stacksjs/ts-tokens/commit/38fe0ec)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.35 ([9752faa](https://github.com/stacksjs/ts-tokens/commit/9752faa)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up pickier 0.1.33 ([6a4e51b](https://github.com/stacksjs/ts-tokens/commit/6a4e51b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up @stacksjs/logsmith 0.2.3 ([8ee9546](https://github.com/stacksjs/ts-tokens/commit/8ee9546)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: refresh bun.lock to pick up buddy-bot 0.9.20 ([99abb1c](https://github.com/stacksjs/ts-tokens/commit/99abb1c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update shivammathur/setup-php action to v2.37.1 [security] (#2056) ([ae21ef6](https://github.com/stacksjs/ts-tokens/commit/ae21ef6)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#2056](https://github.com/stacksjs/ts-tokens/issues/2056), [#2056](https://github.com/stacksjs/ts-tokens/issues/2056))
- **deps**: bump better-dx to ^0.2.15 ([b44575e](https://github.com/stacksjs/ts-tokens/commit/b44575e)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- drop final eslint references from staged-lint hook config ([7063331](https://github.com/stacksjs/ts-tokens/commit/7063331)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- switch lint scripts from eslint to pickier across all 3 packages ([7946361](https://github.com/stacksjs/ts-tokens/commit/7946361)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock to pick up bun-plugin-dtsx@0.9.18 ([9fd726a](https://github.com/stacksjs/ts-tokens/commit/9fd726a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock and apply pickier --fix ([efd5465](https://github.com/stacksjs/ts-tokens/commit/efd5465)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock ([5900b7a](https://github.com/stacksjs/ts-tokens/commit/5900b7a)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- lint:fix ([b1d4144](https://github.com/stacksjs/ts-tokens/commit/b1d4144)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- refresh bun.lock to pick up latest pickier ([53d49f3](https://github.com/stacksjs/ts-tokens/commit/53d49f3)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up dtsx 0.9.14 and bunfig 0.15.9 ([b378d6f](https://github.com/stacksjs/ts-tokens/commit/b378d6f)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- use --bun flag in release script ([ea3a5be](https://github.com/stacksjs/ts-tokens/commit/ea3a5be)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- fresh install to pick up pickier 0.1.21 ([1b307dd](https://github.com/stacksjs/ts-tokens/commit/1b307dd)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- minor updates ([333ef29](https://github.com/stacksjs/ts-tokens/commit/333ef29)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update vscode config ([6d0f86c](https://github.com/stacksjs/ts-tokens/commit/6d0f86c)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update dependencies ([7b297fe](https://github.com/stacksjs/ts-tokens/commit/7b297fe)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- repo cleanup and modernization ([780e4a1](https://github.com/stacksjs/ts-tokens/commit/780e4a1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add git-hooks config ([62698fc](https://github.com/stacksjs/ts-tokens/commit/62698fc)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove .zed and .cursor folders ([9c54e4b](https://github.com/stacksjs/ts-tokens/commit/9c54e4b)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- remove redundant docs/.vitepress ([443e736](https://github.com/stacksjs/ts-tokens/commit/443e736)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- use Pantry action for publish-commit and add job dependencies ([17e6b43](https://github.com/stacksjs/ts-tokens/commit/17e6b43)) _(by Chris <chrisbreuer93@gmail.com>)_
- update better-dx to ^0.2.7 ([81c7fbf](https://github.com/stacksjs/ts-tokens/commit/81c7fbf)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- enrich CLAUDE.md with detailed project context from README ([a69d423](https://github.com/stacksjs/ts-tokens/commit/a69d423)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- update CLAUDE.md with project context and crosswind details ([6d8fef1](https://github.com/stacksjs/ts-tokens/commit/6d8fef1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- add proper claude code guidelines ([588dc26](https://github.com/stacksjs/ts-tokens/commit/588dc26)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([5985f03](https://github.com/stacksjs/ts-tokens/commit/5985f03)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([8acb32d](https://github.com/stacksjs/ts-tokens/commit/8acb32d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([3b41ce0](https://github.com/stacksjs/ts-tokens/commit/3b41ce0)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([cce76f9](https://github.com/stacksjs/ts-tokens/commit/cce76f9)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([b281ad1](https://github.com/stacksjs/ts-tokens/commit/b281ad1)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([4134cf3](https://github.com/stacksjs/ts-tokens/commit/4134cf3)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d021236](https://github.com/stacksjs/ts-tokens/commit/d021236)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([f7a4acb](https://github.com/stacksjs/ts-tokens/commit/f7a4acb)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([b8afc53](https://github.com/stacksjs/ts-tokens/commit/b8afc53)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([82d62a4](https://github.com/stacksjs/ts-tokens/commit/82d62a4)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([6f039a3](https://github.com/stacksjs/ts-tokens/commit/6f039a3)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([576d613](https://github.com/stacksjs/ts-tokens/commit/576d613)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- **deps**: update dependency bun-plugin-dtsx to ^0.9.9 (#1127) ([4f19a91](https://github.com/stacksjs/ts-tokens/commit/4f19a91)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#1127](https://github.com/stacksjs/ts-tokens/issues/1127), [#1127](https://github.com/stacksjs/ts-tokens/issues/1127))
- **deps**: update all non-major dependencies (#1126) ([2195ffa](https://github.com/stacksjs/ts-tokens/commit/2195ffa)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#1126](https://github.com/stacksjs/ts-tokens/issues/1126), [#1126](https://github.com/stacksjs/ts-tokens/issues/1126))
- wip ([49b8f52](https://github.com/stacksjs/ts-tokens/commit/49b8f52)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([bcaf76d](https://github.com/stacksjs/ts-tokens/commit/bcaf76d)) _(by glennmichael123 <gtorregosa@gmail.com>)_
- wip ([d6e86b0](https://github.com/stacksjs/ts-tokens/commit/d6e86b0)) _(by chrisbreuer <chrisbreuer93@gmail.com>)_
- **deps**: update dependency @vitejs/plugin-react to 5.1.4 (#1117) ([cd23ddf](https://github.com/stacksjs/ts-tokens/commit/cd23ddf)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1117](https://github.com/stacksjs/ts-tokens/issues/1117), [#1117](https://github.com/stacksjs/ts-tokens/issues/1117))
- **deps**: update dependency actions/cache to v5.0.3 (#1119) ([4288c6f](https://github.com/stacksjs/ts-tokens/commit/4288c6f)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1119](https://github.com/stacksjs/ts-tokens/issues/1119), [#1119](https://github.com/stacksjs/ts-tokens/issues/1119))
- **deps**: update dependency react to 19.2.4 (#1120) ([20669a6](https://github.com/stacksjs/ts-tokens/commit/20669a6)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1120](https://github.com/stacksjs/ts-tokens/issues/1120), [#1120](https://github.com/stacksjs/ts-tokens/issues/1120))
- **deps**: update dependency react-dom to 19.2.4 (#1121) ([33c1f3d](https://github.com/stacksjs/ts-tokens/commit/33c1f3d)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1121](https://github.com/stacksjs/ts-tokens/issues/1121), [#1121](https://github.com/stacksjs/ts-tokens/issues/1121))
- **deps**: update actions/cache action to v5 (#37) ([06ac56a](https://github.com/stacksjs/ts-tokens/commit/06ac56a)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#37](https://github.com/stacksjs/ts-tokens/issues/37), [#37](https://github.com/stacksjs/ts-tokens/issues/37))
- **deps**: update dependency @types/node to v25 (#35) ([658779b](https://github.com/stacksjs/ts-tokens/commit/658779b)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#35](https://github.com/stacksjs/ts-tokens/issues/35), [#35](https://github.com/stacksjs/ts-tokens/issues/35))
- **deps**: update dependency vite to 7.3.1 (#1122) ([84ec765](https://github.com/stacksjs/ts-tokens/commit/84ec765)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1122](https://github.com/stacksjs/ts-tokens/issues/1122), [#1122](https://github.com/stacksjs/ts-tokens/issues/1122))
- **deps**: update dependency @solana/web3.js to 2.0.0 (#1115) ([0d51973](https://github.com/stacksjs/ts-tokens/commit/0d51973)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1115](https://github.com/stacksjs/ts-tokens/issues/1115), [#1115](https://github.com/stacksjs/ts-tokens/issues/1115))
- **deps**: update dependency @types/node to 25.2.3 (#1116) ([cf54661](https://github.com/stacksjs/ts-tokens/commit/cf54661)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1116](https://github.com/stacksjs/ts-tokens/issues/1116), [#1116](https://github.com/stacksjs/ts-tokens/issues/1116))
- **deps**: update dependency @vitejs/plugin-vue to 6.0.4 (#1118) ([ef579d2](https://github.com/stacksjs/ts-tokens/commit/ef579d2)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1118](https://github.com/stacksjs/ts-tokens/issues/1118), [#1118](https://github.com/stacksjs/ts-tokens/issues/1118))
- **deps**: update all non-major dependencies (#1125) ([08feb84](https://github.com/stacksjs/ts-tokens/commit/08feb84)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#1125](https://github.com/stacksjs/ts-tokens/issues/1125), [#1125](https://github.com/stacksjs/ts-tokens/issues/1125))
- **deps**: update dependency vue-tsc to 3.2.4 (#1123) ([c550541](https://github.com/stacksjs/ts-tokens/commit/c550541)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1123](https://github.com/stacksjs/ts-tokens/issues/1123), [#1123](https://github.com/stacksjs/ts-tokens/issues/1123))
- **deps**: update all non-major dependencies (#1124) ([483cec2](https://github.com/stacksjs/ts-tokens/commit/483cec2)) _(by Chris <chrisbreuer93@gmail.com>)_ ([#1124](https://github.com/stacksjs/ts-tokens/issues/1124), [#1124](https://github.com/stacksjs/ts-tokens/issues/1124))
- minor updates ([8f0f267](https://github.com/stacksjs/ts-tokens/commit/8f0f267)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update dependency @inquirer/prompts to v8 (#419) ([f6fd96b](https://github.com/stacksjs/ts-tokens/commit/f6fd96b)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#419](https://github.com/stacksjs/ts-tokens/issues/419), [#419](https://github.com/stacksjs/ts-tokens/issues/419))
- **deps**: update dependency ora to v9 (#420) ([59d167e](https://github.com/stacksjs/ts-tokens/commit/59d167e)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#420](https://github.com/stacksjs/ts-tokens/issues/420), [#420](https://github.com/stacksjs/ts-tokens/issues/420))
- **deps**: update actions/upload-pages-artifact action to v4 (#428) ([ebdfb3c](https://github.com/stacksjs/ts-tokens/commit/ebdfb3c)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#428](https://github.com/stacksjs/ts-tokens/issues/428), [#428](https://github.com/stacksjs/ts-tokens/issues/428))
- **deps**: update react monorepo to v19 (#20) ([18bcf2d](https://github.com/stacksjs/ts-tokens/commit/18bcf2d)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#20](https://github.com/stacksjs/ts-tokens/issues/20), [#20](https://github.com/stacksjs/ts-tokens/issues/20))
- **deps**: update actions/checkout action to v6 (#17) ([508704f](https://github.com/stacksjs/ts-tokens/commit/508704f)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#17](https://github.com/stacksjs/ts-tokens/issues/17), [#17](https://github.com/stacksjs/ts-tokens/issues/17))
- Release & Distribution & Security Completion ([f8cf203](https://github.com/stacksjs/ts-tokens/commit/f8cf203)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- gitignore to storybook ([d45c9c4](https://github.com/stacksjs/ts-tokens/commit/d45c9c4)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Update TODO check lists ([4989295](https://github.com/stacksjs/ts-tokens/commit/4989295)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- examples ([a6c498b](https://github.com/stacksjs/ts-tokens/commit/a6c498b)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Update TODO ([9a401c1](https://github.com/stacksjs/ts-tokens/commit/9a401c1)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Port Competitor & Metaplex Features into ts-tokens ([bc23995](https://github.com/stacksjs/ts-tokens/commit/bc23995)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Automation & Scripting ([677dbd8](https://github.com/stacksjs/ts-tokens/commit/677dbd8)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Listing & Sales ([29a10e0](https://github.com/stacksjs/ts-tokens/commit/29a10e0)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Token-2022 (SPL Token Extensions) ([987e075](https://github.com/stacksjs/ts-tokens/commit/987e075)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Security & Best Practices — Complete ([34fe8c2](https://github.com/stacksjs/ts-tokens/commit/34fe8c2)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Release & Distribution ([a56a5d2](https://github.com/stacksjs/ts-tokens/commit/a56a5d2)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- CLI Commands added ([256936c](https://github.com/stacksjs/ts-tokens/commit/256936c)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- Token Metadata & Queries ([dfb1de4](https://github.com/stacksjs/ts-tokens/commit/dfb1de4)) _(by [devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind))_
- update build ([aeac133](https://github.com/stacksjs/ts-tokens/commit/aeac133)) _(by Adelino Ngomacha <adelinob335@gmail.com>)_
- wip ([2258e22](https://github.com/stacksjs/ts-tokens/commit/2258e22)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d9d8f5f](https://github.com/stacksjs/ts-tokens/commit/d9d8f5f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([6282282](https://github.com/stacksjs/ts-tokens/commit/6282282)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([2bdecc9](https://github.com/stacksjs/ts-tokens/commit/2bdecc9)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([cca890b](https://github.com/stacksjs/ts-tokens/commit/cca890b)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([bfe570c](https://github.com/stacksjs/ts-tokens/commit/bfe570c)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([746b45e](https://github.com/stacksjs/ts-tokens/commit/746b45e)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a4cd215](https://github.com/stacksjs/ts-tokens/commit/a4cd215)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([6902706](https://github.com/stacksjs/ts-tokens/commit/6902706)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([4c0991a](https://github.com/stacksjs/ts-tokens/commit/4c0991a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([caa9c97](https://github.com/stacksjs/ts-tokens/commit/caa9c97)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([1d35710](https://github.com/stacksjs/ts-tokens/commit/1d35710)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([46179c8](https://github.com/stacksjs/ts-tokens/commit/46179c8)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([5294580](https://github.com/stacksjs/ts-tokens/commit/5294580)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([9b01b7e](https://github.com/stacksjs/ts-tokens/commit/9b01b7e)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([152b99f](https://github.com/stacksjs/ts-tokens/commit/152b99f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([f8fdb5f](https://github.com/stacksjs/ts-tokens/commit/f8fdb5f)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([737fa51](https://github.com/stacksjs/ts-tokens/commit/737fa51)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([1770790](https://github.com/stacksjs/ts-tokens/commit/1770790)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([a7c2840](https://github.com/stacksjs/ts-tokens/commit/a7c2840)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d42cb6a](https://github.com/stacksjs/ts-tokens/commit/d42cb6a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([d9a4048](https://github.com/stacksjs/ts-tokens/commit/d9a4048)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([8eb5b3a](https://github.com/stacksjs/ts-tokens/commit/8eb5b3a)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([024fa69](https://github.com/stacksjs/ts-tokens/commit/024fa69)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([b512ddb](https://github.com/stacksjs/ts-tokens/commit/b512ddb)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([25514b3](https://github.com/stacksjs/ts-tokens/commit/25514b3)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ca4869d](https://github.com/stacksjs/ts-tokens/commit/ca4869d)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([ef9eeb5](https://github.com/stacksjs/ts-tokens/commit/ef9eeb5)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([23ae978](https://github.com/stacksjs/ts-tokens/commit/23ae978)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([88df464](https://github.com/stacksjs/ts-tokens/commit/88df464)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([90e5b80](https://github.com/stacksjs/ts-tokens/commit/90e5b80)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([215d44e](https://github.com/stacksjs/ts-tokens/commit/215d44e)) _(by Chris <chrisbreuer93@gmail.com>)_
- update tooling ([7a1d3f3](https://github.com/stacksjs/ts-tokens/commit/7a1d3f3)) _(by Adelino Ngomacha <adelinob335@gmail.com>)_
- wip ([13c1424](https://github.com/stacksjs/ts-tokens/commit/13c1424)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([0e65842](https://github.com/stacksjs/ts-tokens/commit/0e65842)) _(by Chris <chrisbreuer93@gmail.com>)_
- **deps**: update all non-major dependencies (#3) ([60c9767](https://github.com/stacksjs/ts-tokens/commit/60c9767)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#3](https://github.com/stacksjs/ts-tokens/issues/3), [#3](https://github.com/stacksjs/ts-tokens/issues/3))
- wip ([9b9c4e9](https://github.com/stacksjs/ts-tokens/commit/9b9c4e9)) _(by Chris <chrisbreuer93@gmail.com>)_
- wip ([1951655](https://github.com/stacksjs/ts-tokens/commit/1951655)) _(by Chris <chrisbreuer93@gmail.com>)_
- initial commit ([a727b90](https://github.com/stacksjs/ts-tokens/commit/a727b90)) _(by Chris <chrisbreuer93@gmail.com>)_

## 📄 Miscellaneous

- Merge pull request #5 from stacksjs/renovate/all-minor-patch ([f0f91ec](https://github.com/stacksjs/ts-tokens/commit/f0f91ec)) _(by [renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot]))_ ([#5](https://github.com/stacksjs/ts-tokens/issues/5), [#5](https://github.com/stacksjs/ts-tokens/issues/5))

## Contributors

- _Adelino Ngomacha <adelinob335@gmail.com>_
- _Chris <chrisbreuer93@gmail.com>_
- _Glenn Michael Torregosa <gtorregosa@gmail.com>_
- _[devjan <37568966+fingersandmind@users.noreply.github.com>](https://github.com/fingersandmind)_
- _[renovate[bot] <29139614+renovate[bot]@users.noreply.github.com>](https://github.com/renovate[bot])_
- _chrisbreuer <chrisbreuer93@gmail.com>_
- _glennmichael123 <gtorregosa@gmail.com>_
