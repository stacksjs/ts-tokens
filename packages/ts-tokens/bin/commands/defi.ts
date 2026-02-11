import { getConfig } from '../../src/config'

export function register(cli: any): void {
  // ============================================
  // Jupiter Limit Orders
  // ============================================

  cli
    .command('defi:limit-buy <output-mint> <amount> <price>', 'Create a limit buy order')
    .option('--input-mint <mint>', 'Input token mint', 'So11111111111111111111111111111111111111112')
    .option('--expire <seconds>', 'Expiry in seconds')
    .action(async (outputMint: string, amount: string, price: string, options: { inputMint?: string; expire?: string }) => {
      const config = await getConfig()
      const { createLimitOrder, calculateTakingAmount } = await import('../../src/defi/jupiter-limit')

      try {
        const makingAmount = BigInt(amount)
        const takingAmount = calculateTakingAmount(makingAmount, parseFloat(price), 9, 9)

        console.log('Creating limit buy order...')
        const result = await createLimitOrder({
          inputMint: options.inputMint || 'So11111111111111111111111111111111111111112',
          outputMint,
          makingAmount,
          takingAmount,
          expireAt: options.expire ? Math.floor(Date.now() / 1000) + parseInt(options.expire) : undefined,
        }, config)

        console.log('\n\u2713 Limit order created!')
        console.log(`  Order: ${result.orderPubkey}`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('defi:limit-sell <input-mint> <amount> <price>', 'Create a limit sell order')
    .option('--output-mint <mint>', 'Output token mint', 'So11111111111111111111111111111111111111112')
    .option('--expire <seconds>', 'Expiry in seconds')
    .action(async (inputMint: string, amount: string, price: string, options: { outputMint?: string; expire?: string }) => {
      const config = await getConfig()
      const { createLimitOrder, calculateTakingAmount } = await import('../../src/defi/jupiter-limit')

      try {
        const makingAmount = BigInt(amount)
        const takingAmount = calculateTakingAmount(makingAmount, parseFloat(price), 9, 9)

        console.log('Creating limit sell order...')
        const result = await createLimitOrder({
          inputMint,
          outputMint: options.outputMint || 'So11111111111111111111111111111111111111112',
          makingAmount,
          takingAmount,
          expireAt: options.expire ? Math.floor(Date.now() / 1000) + parseInt(options.expire) : undefined,
        }, config)

        console.log('\n\u2713 Limit order created!')
        console.log(`  Order: ${result.orderPubkey}`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('defi:limit-cancel <orders...>', 'Cancel limit orders')
    .action(async (orders: string[]) => {
      const config = await getConfig()
      const { cancelLimitOrders } = await import('../../src/defi/jupiter-limit')

      try {
        console.log(`Cancelling ${orders.length} order(s)...`)
        const result = await cancelLimitOrders(orders, config)
        console.log('\n\u2713 Orders cancelled!')
        for (const sig of result.signatures) {
          console.log(`  Signature: ${sig}`)
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('defi:limit-list [wallet]', 'List open limit orders')
    .action(async (wallet?: string) => {
      const { getOpenLimitOrders, formatLimitOrder } = await import('../../src/defi/jupiter-limit')

      try {
        if (!wallet) {
          const config = await getConfig()
          const { getPublicKey } = await import('../../src/drivers/solana/wallet')
          wallet = getPublicKey(config)
        }

        const orders = await getOpenLimitOrders(wallet)

        if (orders.length === 0) {
          console.log('No open limit orders')
          return
        }

        console.log(`\nOpen Limit Orders (${orders.length}):\n`)
        for (const order of orders) {
          console.log(formatLimitOrder(order))
          console.log('')
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  // ============================================
  // Jupiter DCA
  // ============================================

  cli
    .command('defi:dca-create', 'Create a DCA position')
    .option('--input-mint <mint>', 'Input token mint')
    .option('--output-mint <mint>', 'Output token mint')
    .option('--total <amount>', 'Total input amount')
    .option('--per-cycle <amount>', 'Amount per cycle')
    .option('--frequency <seconds>', 'Cycle frequency in seconds')
    .action(async (options: {
      inputMint?: string
      outputMint?: string
      total?: string
      perCycle?: string
      frequency?: string
    }) => {
      if (!options.inputMint || !options.outputMint || !options.total || !options.perCycle || !options.frequency) {
        console.error('Error: --input-mint, --output-mint, --total, --per-cycle, and --frequency are required')
        process.exit(1)
      }

      const config = await getConfig()
      const { createDCA } = await import('../../src/defi/jupiter-dca')

      try {
        console.log('Creating DCA position...')
        const result = await createDCA({
          inputMint: options.inputMint,
          outputMint: options.outputMint,
          totalInAmount: BigInt(options.total),
          inAmountPerCycle: BigInt(options.perCycle),
          cycleFrequency: parseInt(options.frequency),
        }, config)

        console.log('\n\u2713 DCA position created!')
        console.log(`  DCA: ${result.dcaPubkey}`)
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('defi:dca-close <dca>', 'Close a DCA position')
    .action(async (dca: string) => {
      const config = await getConfig()
      const { closeDCA } = await import('../../src/defi/jupiter-dca')

      try {
        console.log(`Closing DCA position ${dca}...`)
        const result = await closeDCA(dca, config)
        console.log('\n\u2713 DCA position closed!')
        console.log(`  Signature: ${result.signature}`)
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })

  cli
    .command('defi:dca-list [wallet]', 'List DCA positions')
    .action(async (wallet?: string) => {
      const { getDCAPositions, formatDCAPosition } = await import('../../src/defi/jupiter-dca')

      try {
        if (!wallet) {
          const config = await getConfig()
          const { getPublicKey } = await import('../../src/drivers/solana/wallet')
          wallet = getPublicKey(config)
        }

        const positions = await getDCAPositions(wallet)

        if (positions.length === 0) {
          console.log('No DCA positions')
          return
        }

        console.log(`\nDCA Positions (${positions.length}):\n`)
        for (const pos of positions) {
          console.log(formatDCAPosition(pos))
          console.log('')
        }
      } catch (error) {
        console.error('Error:', error instanceof Error ? error.message : error)
        process.exit(1)
      }
    })
}
