import {
  stakingCreatePool, stakingFundPool, stakingStake, stakingUnstake,
  stakingClaim, stakingCompound, stakingPoolInfo, stakingMyStakes,
  stakingLockCreate, stakingLockClaim, stakingLockInfo,
} from '../../src/cli/commands/staking'

export function register(cli: any): void {
  cli
    .command('staking:create-pool', 'Create a staking pool')
    .option('--stake-mint <mint>', 'Mint that users stake')
    .option('--reward-mint <mint>', 'Mint paid out as rewards')
    .option('--reward-rate <rate>', 'Reward rate')
    .option('--reward-duration <seconds>', 'Reward distribution duration in seconds')
    .option('--min-stake-duration <seconds>', 'Minimum stake duration in seconds')
    .option('--early-unstake-penalty <bps>', 'Early unstake penalty in basis points')
    .action(async (options: any) => {
      await stakingCreatePool(options)
    })

  cli
    .command('staking:fund <pool> <amount>', 'Fund a staking pool with rewards')
    .action(async (pool: string, amount: string) => {
      await stakingFundPool(pool, amount)
    })

  cli
    .command('staking:stake <pool> <amount>', 'Stake tokens into a pool')
    .action(async (pool: string, amount: string) => {
      await stakingStake(pool, amount)
    })

  cli
    .command('staking:unstake <pool> [amount]', 'Unstake tokens from a pool')
    .action(async (pool: string, amount?: string) => {
      await stakingUnstake(pool, amount)
    })

  cli
    .command('staking:claim <pool>', 'Claim staking rewards')
    .action(async (pool: string) => {
      await stakingClaim(pool)
    })

  cli
    .command('staking:compound <pool>', 'Compound staking rewards')
    .action(async (pool: string) => {
      await stakingCompound(pool)
    })

  cli
    .command('staking:pool-info <pool>', 'Show staking pool information')
    .action(async (pool: string) => {
      await stakingPoolInfo(pool)
    })

  cli
    .command('staking:my-stakes', 'Show your active stakes')
    .action(async () => {
      await stakingMyStakes()
    })

  cli
    .command('staking:lock-create', 'Create a token lock / vesting schedule')
    .option('--recipient <address>', 'Recipient address')
    .option('--mint <mint>', 'Token mint address')
    .option('--amount <amount>', 'Amount to lock')
    .option('--cliff-months <months>', 'Cliff period in months')
    .option('--vesting-months <months>', 'Vesting period in months')
    .option('--cliff-percentage <bps>', 'Percentage unlocked at cliff (basis points)')
    .action(async (options: any) => {
      await stakingLockCreate(options)
    })

  cli
    .command('staking:lock-claim <lockId>', 'Claim vested tokens from a lock')
    .action(async (lockId: string) => {
      await stakingLockClaim(lockId)
    })

  cli
    .command('staking:lock-info <lockId>', 'Show token lock information')
    .action(async (lockId: string) => {
      await stakingLockInfo(lockId)
    })
}
