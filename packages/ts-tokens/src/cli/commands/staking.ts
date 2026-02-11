/** CLI Staking command handlers. */

import type { PublicKey } from '@solana/web3.js'
import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

// ---------------------------------------------------------------------------
// Pool Management
// ---------------------------------------------------------------------------

export async function stakingCreatePool(options: {
  stakeMint: string
  rewardMint: string
  rewardRate: string
  rewardDuration: string
  minStakeDuration?: string
  earlyUnstakePenalty?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createStakePool } = await import('../../staking/pool-management')

    const result = await withSpinner('Creating staking pool...', () =>
      createStakePool({
        stakeMint: new PublicKey(options.stakeMint),
        rewardMint: new PublicKey(options.rewardMint),
        rewardRate: BigInt(options.rewardRate),
        rewardDuration: BigInt(options.rewardDuration),
        minStakeDuration: options.minStakeDuration ? BigInt(options.minStakeDuration) : undefined,
        earlyUnstakePenalty: options.earlyUnstakePenalty ? parseInt(options.earlyUnstakePenalty) : undefined,
      }, config)
    )

    success('Staking pool created')
    keyValue('Pool', result.pool ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingFundPool(pool: string, amount: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { fundRewards } = await import('../../staking/pool-management')

    const result = await withSpinner('Funding reward pool...', () =>
      fundRewards({
        pool: new PublicKey(pool),
        amount: BigInt(amount),
      }, config)
    )

    success('Rewards funded')
    keyValue('Amount', amount)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// User Staking
// ---------------------------------------------------------------------------

export async function stakingStake(pool: string, amount: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { stake } = await import('../../staking/operations')

    const result = await withSpinner('Staking tokens...', () =>
      stake({
        pool: new PublicKey(pool),
        amount: BigInt(amount),
      }, config)
    )

    success('Tokens staked')
    keyValue('Amount', amount)
    keyValue('Stake Entry', result.stakeEntry ?? '')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingUnstake(pool: string, amount?: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')

    if (!amount) {
      // Unstake all — fetch current stake amount
      const { createConnection } = await import('../../drivers/solana/connection')
      const { loadWallet } = await import('../../drivers/solana/wallet')
      const { getUserStakes } = await import('../../staking/stake')
      const connection = createConnection(config)
      const payer = loadWallet(config)
      const poolPk = new PublicKey(pool)
      const stakes = await getUserStakes(connection, poolPk, payer.publicKey)
      const total = stakes.reduce((sum, s) => sum + s.amount, 0n)
      if (total === 0n) {
        info('No active stakes found')
        return
      }
      amount = total.toString()
    }

    const { unstake } = await import('../../staking/operations')

    const result = await withSpinner('Unstaking tokens...', () =>
      unstake({
        pool: new PublicKey(pool),
        amount: BigInt(amount!),
      }, config)
    )

    success('Tokens unstaked')
    keyValue('Amount', amount)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingClaim(pool: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { claimRewards } = await import('../../staking/operations')

    const result = await withSpinner('Claiming rewards...', () =>
      claimRewards({ pool: new PublicKey(pool) }, config)
    )

    success('Rewards claimed')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingCompound(pool: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { compoundRewards } = await import('../../staking/operations')

    const result = await withSpinner('Compounding rewards...', () =>
      compoundRewards({ pool: new PublicKey(pool) }, config)
    )

    success('Rewards compounded')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Info / Query
// ---------------------------------------------------------------------------

export async function stakingPoolInfo(pool: string): Promise<void> {
  try {
    const config = await getConfig()
    const { PublicKey } = await import('@solana/web3.js')
    const { createConnection } = await import('../../drivers/solana/connection')
    const { getPool, getPoolStats } = await import('../../staking/pool')
    const { formatDuration } = await import('../../staking/stake')

    const connection = createConnection(config)
    const poolPk = new PublicKey(pool)

    const poolData = await getPool(connection, poolPk)
    if (!poolData) {
      error('Pool not found')
      process.exit(1)
    }

    const stats = await getPoolStats(connection, poolPk)

    header('Staking Pool Info')
    keyValue('Address', pool)
    keyValue('Authority', poolData.authority.toBase58())
    keyValue('Stake Mint', poolData.stakeMint.toBase58())
    keyValue('Reward Mint', poolData.rewardMint.toBase58())
    keyValue('Total Staked', poolData.totalStaked.toString())
    keyValue('Reward Rate', `${poolData.rewardRate} / second`)
    keyValue('Min Stake Duration', formatDuration(poolData.minStakeDuration))
    keyValue('Early Unstake Penalty', `${poolData.earlyUnstakePenalty} bps`)
    keyValue('Paused', poolData.paused ? 'Yes' : 'No')

    if (stats) {
      info('')
      header('Pool Statistics')
      keyValue('Total Stakers', stats.totalStakers.toString())
      keyValue('APR', `${stats.currentApr.toFixed(2)}%`)
      keyValue('Remaining Rewards', stats.remainingRewards.toString())
      keyValue('Time Until Empty', formatDuration(stats.timeUntilEmpty))
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingMyStakes(): Promise<void> {
  try {
    const config = await getConfig()
    const { createConnection } = await import('../../drivers/solana/connection')
    const { loadWallet } = await import('../../drivers/solana/wallet')
    const { formatDuration } = await import('../../staking/stake')

    const connection = createConnection(config)
    const payer = loadWallet(config)

    // Get stake entries owned by this wallet
    const { STAKING_PROGRAM_ID } = await import('../../staking/program')
    let accounts: ReadonlyArray<{ pubkey: PublicKey; account: { data: Buffer } }> = []
    try {
      accounts = await connection.getProgramAccounts(STAKING_PROGRAM_ID, {
        filters: [
          { dataSize: 112 },
          { memcmp: { offset: 8, bytes: payer.publicKey.toBase58() } },
        ],
      })
    } catch {
      // Program may not be deployed
    }

    if (accounts.length === 0) {
      info('No active stakes found')
      return
    }

    const { PublicKey } = await import('@solana/web3.js')

    header(`Your Stakes (${accounts.length})`)
    for (const { pubkey, account } of accounts) {
      const data = account.data as Buffer
      const pool = new PublicKey(data.subarray(40, 72))
      const amount = data.readBigUInt64LE(72)
      const stakedAt = data.readBigUInt64LE(88)
      const lockEndTime = data.readBigUInt64LE(104)
      const now = BigInt(Math.floor(Date.now() / 1000))
      const duration = now - stakedAt

      keyValue('Pool', pool.toBase58())
      keyValue('Amount', amount.toString())
      keyValue('Staked For', formatDuration(duration))
      if (lockEndTime > now) {
        keyValue('Lock Remaining', formatDuration(lockEndTime - now))
      }
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// ---------------------------------------------------------------------------
// Token Locking (delegates to vesting module)
// ---------------------------------------------------------------------------

export async function stakingLockCreate(options: {
  recipient: string
  mint: string
  amount: string
  cliffMonths: string
  vestingMonths: string
  cliffPercentage?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { createVestingSchedule } = await import('../../vesting/schedule')

    const result = await withSpinner('Creating token lock...', () =>
      createVestingSchedule({
        recipient: options.recipient,
        mint: options.mint,
        totalAmount: BigInt(options.amount),
        cliffMonths: parseInt(options.cliffMonths),
        vestingMonths: parseInt(options.vestingMonths),
        cliffPercentage: options.cliffPercentage ? parseInt(options.cliffPercentage) : 10,
        startDate: Date.now(),
      }, config)
    )

    success('Token lock created')
    keyValue('Lock ID', result.id)
    keyValue('Recipient', result.recipient)
    keyValue('Amount', options.amount)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingLockClaim(lockId: string): Promise<void> {
  try {
    const config = await getConfig()
    const { claimVestedTokens } = await import('../../vesting/schedule')

    const result = await withSpinner('Claiming vested tokens...', () =>
      claimVestedTokens(lockId, config)
    )

    success('Vested tokens claimed')
    keyValue('Claimed', result.amount.toString())
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function stakingLockInfo(lockId: string): Promise<void> {
  try {
    const { getVestingStatus } = await import('../../vesting/schedule')

    const status = await getVestingStatus(lockId)

    if (!status) {
      error('Lock not found')
      process.exit(1)
    }

    header('Token Lock Info')
    keyValue('ID', status.id)
    keyValue('Recipient', status.recipient)
    keyValue('Mint', status.mint)
    keyValue('Total Amount', status.totalAmount.toString())
    keyValue('Vested', `${status.vestedAmount.toString()} (${status.percentageVested.toFixed(1)}%)`)
    keyValue('Claimed', `${status.claimedAmount.toString()} (${status.percentageClaimed.toFixed(1)}%)`)
    keyValue('Claimable', status.claimableAmount.toString())
    keyValue('Status', status.status)
    keyValue('Cliff Reached', status.isCliffReached ? 'Yes' : 'No')
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
