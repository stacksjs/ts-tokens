/**
 * Fanout Wallets Module
 *
 * Revenue and royalty distribution via fanout wallets.
 */

export * from './types'

export {
  createFanoutWallet,
  getFanoutWallet,
  listFanoutWallets,
} from './create'

export {
  distribute,
  previewDistribution,
} from './distribute'

export {
  addFanoutMember,
  removeFanoutMember,
  updateMemberShares,
  deleteFanoutWallet,
  formatFanoutWallet,
} from './manage'
