/** CLI DeFi command handlers. */

import { success, error, keyValue, header, info } from '../utils'
import { withSpinner } from '../utils/spinner'
import { getConfig } from '../../config'

const SOL_MINT = 'So11111111111111111111111111111111111111112'

export async function defiLimitBuy(outputMint: string, amount: string, price: string, options: {
  inputMint?: string
  expire?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { createLimitOrder, calculateTakingAmount } = await import('../../defi/jupiter-limit')

    const makingAmount = BigInt(amount)
    const takingAmount = calculateTakingAmount(makingAmount, parseFloat(price), 9, 9)

    const result = await withSpinner('Creating limit buy order...', () =>
      createLimitOrder({
        inputMint: options.inputMint || SOL_MINT,
        outputMint,
        makingAmount,
        takingAmount,
        expireAt: options.expire ? Math.floor(Date.now() / 1000) + parseInt(options.expire) : undefined,
      }, config)
    )

    success('Limit order created')
    keyValue('Order', result.orderPubkey)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiLimitSell(inputMint: string, amount: string, price: string, options: {
  outputMint?: string
  expire?: string
}): Promise<void> {
  try {
    const config = await getConfig()
    const { createLimitOrder, calculateTakingAmount } = await import('../../defi/jupiter-limit')

    const makingAmount = BigInt(amount)
    const takingAmount = calculateTakingAmount(makingAmount, parseFloat(price), 9, 9)

    const result = await withSpinner('Creating limit sell order...', () =>
      createLimitOrder({
        inputMint,
        outputMint: options.outputMint || SOL_MINT,
        makingAmount,
        takingAmount,
        expireAt: options.expire ? Math.floor(Date.now() / 1000) + parseInt(options.expire) : undefined,
      }, config)
    )

    success('Limit order created')
    keyValue('Order', result.orderPubkey)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiLimitCancel(orders: string[]): Promise<void> {
  try {
    const config = await getConfig()
    const { cancelLimitOrders } = await import('../../defi/jupiter-limit')

    const result = await withSpinner(`Cancelling ${orders.length} order(s)...`, () =>
      cancelLimitOrders(orders, config)
    )

    success('Orders cancelled')
    for (const sig of result.signatures) {
      keyValue('Signature', sig)
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiLimitList(wallet?: string): Promise<void> {
  try {
    const { getOpenLimitOrders, formatLimitOrder } = await import('../../defi/jupiter-limit')

    if (!wallet) {
      const config = await getConfig()
      const { getPublicKey } = await import('../../drivers/solana/wallet')
      wallet = getPublicKey(config)
    }

    const orders = await getOpenLimitOrders(wallet)

    if (orders.length === 0) {
      info('No open limit orders')
      return
    }

    header(`Open Limit Orders (${orders.length})`)
    for (const order of orders) {
      info(formatLimitOrder(order))
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiDcaCreate(options: {
  inputMint?: string
  outputMint?: string
  total?: string
  perCycle?: string
  frequency?: string
}): Promise<void> {
  if (!options.inputMint || !options.outputMint || !options.total || !options.perCycle || !options.frequency) {
    error('--input-mint, --output-mint, --total, --per-cycle, and --frequency are required')
    process.exit(1)
  }

  try {
    const config = await getConfig()
    const { createDCA } = await import('../../defi/jupiter-dca')

    const result = await withSpinner('Creating DCA position...', () =>
      createDCA({
        inputMint: options.inputMint!,
        outputMint: options.outputMint!,
        totalInAmount: BigInt(options.total!),
        inAmountPerCycle: BigInt(options.perCycle!),
        cycleFrequency: parseInt(options.frequency!),
      }, config)
    )

    success('DCA position created')
    keyValue('DCA', result.dcaPubkey)
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiDcaClose(dca: string): Promise<void> {
  try {
    const config = await getConfig()
    const { closeDCA } = await import('../../defi/jupiter-dca')

    const result = await withSpinner(`Closing DCA position ${dca}...`, () =>
      closeDCA(dca, config)
    )

    success('DCA position closed')
    keyValue('Signature', result.signature)
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

export async function defiDcaList(wallet?: string): Promise<void> {
  try {
    const { getDCAPositions, formatDCAPosition } = await import('../../defi/jupiter-dca')

    if (!wallet) {
      const config = await getConfig()
      const { getPublicKey } = await import('../../drivers/solana/wallet')
      wallet = getPublicKey(config)
    }

    const positions = await getDCAPositions(wallet)

    if (positions.length === 0) {
      info('No DCA positions')
      return
    }

    header(`DCA Positions (${positions.length})`)
    for (const pos of positions) {
      info(formatDCAPosition(pos))
      info('')
    }
  } catch (err) {
    error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}
