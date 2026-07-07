import {
  multisigCreate, multisigInfo, multisigOwners, multisigPropose,
  multisigApprove, multisigReject, multisigExecute, multisigPending,
  multisigHistory,
} from '../../src/cli/commands/multisig'

function toArray(value: unknown): string[] {
  if (Array.isArray(value))
    return value.map(String)
  if (typeof value === 'string')
    return value.split(',').map(s => s.trim()).filter(Boolean)
  return []
}

export function register(cli: any): void {
  cli
    .command('multisig:create', 'Create an on-chain multisig')
    .option('--owners <address>', 'Owner address (repeat for multiple, or comma-separated)')
    .option('--threshold <n>', 'Number of approvals required')
    .action(async (options: any) => {
      await multisigCreate({ ...options, owners: toArray(options.owners) })
    })

  cli
    .command('multisig:info <address>', 'Show multisig information')
    .action(async (address: string) => {
      await multisigInfo(address)
    })

  cli
    .command('multisig:owners <address>', 'List multisig owners')
    .action(async (address: string) => {
      await multisigOwners(address)
    })

  cli
    .command('multisig:propose <multisig>', 'Propose a transaction')
    .option('--instruction-data <hex>', 'Instruction data as hex')
    .option('--expires-in <seconds>', 'Proposal expiry in seconds')
    .action(async (multisig: string, options: any) => {
      await multisigPropose(multisig, options)
    })

  cli
    .command('multisig:approve <multisig> <txIndex>', 'Approve a proposed transaction')
    .action(async (multisig: string, txIndex: string) => {
      await multisigApprove(multisig, txIndex)
    })

  cli
    .command('multisig:reject <multisig> <txIndex>', 'Reject a proposed transaction')
    .action(async (multisig: string, txIndex: string) => {
      await multisigReject(multisig, txIndex)
    })

  cli
    .command('multisig:execute <multisig> <txIndex>', 'Execute an approved transaction')
    .action(async (multisig: string, txIndex: string) => {
      await multisigExecute(multisig, txIndex)
    })

  cli
    .command('multisig:pending <multisig>', 'List pending transactions')
    .action(async (multisig: string) => {
      await multisigPending(multisig)
    })

  cli
    .command('multisig:history <multisig>', 'Show multisig transaction history')
    .action(async (multisig: string) => {
      await multisigHistory(multisig)
    })
}
