import { CLI } from '@stacksjs/clapp'
import { version } from '../package.json'
import { register as registerConfig } from './commands/config'
import { register as registerWallet } from './commands/wallet'
import { register as registerToken } from './commands/token'
import { register as registerNft } from './commands/nft'
import { register as registerCandyMachine } from './commands/candy-machine'
import { register as registerStorage } from './commands/storage'
import { register as registerUtility } from './commands/utility'
import { register as registerSecurity } from './commands/security'
import { register as registerMarketplace } from './commands/marketplace'
import { register as registerBatch } from './commands/batch'
import { register as registerAutomation } from './commands/automation'
import { register as registerDefi } from './commands/defi'
import { register as registerDev } from './commands/dev'
import { register as registerStaking } from './commands/staking'
import { register as registerMultisig } from './commands/multisig'
import { register as registerPnft } from './commands/pnft'
import { register as registerLegacy } from './commands/legacy'
import { register as registerSimpleNft } from './commands/simple-nft'
import { register as registerFix } from './commands/fix'

const cli = new (CLI as any)('tokens', {
  description: 'A CLI for managing fungible and non-fungible tokens on Solana',
})

registerConfig(cli)
registerWallet(cli)
registerToken(cli)
registerNft(cli)
registerCandyMachine(cli)
registerStorage(cli)
registerUtility(cli)
registerSecurity(cli)
registerMarketplace(cli)
registerBatch(cli)
registerAutomation(cli)
registerDefi(cli)
registerDev(cli)
registerStaking(cli)
registerMultisig(cli)
registerPnft(cli)
registerLegacy(cli)
registerSimpleNft(cli)
registerFix(cli)

cli.command('version', 'Show the version of the CLI').action(() => {
  console.log(`ts-tokens v${version}`)
})
cli.version(version)
cli.help()
cli.parse()
