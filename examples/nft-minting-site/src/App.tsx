import { useState } from 'react'
import { PhantomWalletAdapter } from 'ts-tokens/wallets'

function App() {
  const [wallet] = useState(() => new PhantomWalletAdapter())
  const [connected, setConnected] = useState(false)
  const [name, setName] = useState('')
  const [uri, setUri] = useState('')
  const [status, setStatus] = useState('')

  async function connectWallet() {
    try {
      await wallet.connect()
      setConnected(true)
      setStatus(`Connected: ${wallet.publicKey?.toBase58()}`)
    } catch (err) {
      setStatus(`Connection failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  async function disconnectWallet() {
    await wallet.disconnect()
    setConnected(false)
    setStatus('Disconnected')
  }

  async function handleMint() {
    if (!name || !uri) {
      setStatus('Please provide a name and metadata URI')
      return
    }

    setStatus('Minting NFT...')

    try {
      // In a real app you'd call createNFT with a proper config.
      // This example demonstrates the wallet adapter integration.
      setStatus(`Ready to mint "${name}" with URI: ${uri} (connect to devnet to execute)`)
    } catch (err) {
      setStatus(`Mint failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  return (
    <div className="app">
      <h1>NFT Minting Site</h1>
      <p className="subtitle">Mint NFTs on Solana using ts-tokens</p>

      <section className="wallet">
        {connected ? (
          <button onClick={disconnectWallet}>Disconnect</button>
        ) : (
          <button onClick={connectWallet}>Connect Phantom</button>
        )}
      </section>

      {connected && (
        <section className="mint-form">
          <h2>Mint NFT</h2>
          <input
            type="text"
            placeholder="NFT Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Metadata URI (JSON)"
            value={uri}
            onChange={(e) => setUri(e.target.value)}
          />
          <button onClick={handleMint}>Mint NFT</button>
        </section>
      )}

      {status && <p className="status">{status}</p>}
    </div>
  )
}

export default App
