import { ref } from 'vue'
import { PhantomWalletAdapter } from 'ts-tokens/wallets'

const wallet = new PhantomWalletAdapter()
const connected = ref(false)
const publicKey = ref<string | null>(null)

export function useWallet() {
  async function connect() {
    try {
      await wallet.connect()
      connected.value = true
      publicKey.value = wallet.publicKey?.toBase58() ?? null
    } catch (err) {
      console.error('Wallet connection failed:', err)
    }
  }

  async function disconnect() {
    await wallet.disconnect()
    connected.value = false
    publicKey.value = null
  }

  return {
    wallet,
    connected,
    publicKey,
    connect,
    disconnect,
  }
}
