import { useState } from 'react'
import { PhantomWalletAdapter } from 'ts-tokens/wallets'
import { CreateCandyMachine } from './components/CreateCandyMachine'
import { MintButton } from './components/MintButton'

function App() {
  const [wallet] = useState(() => new PhantomWalletAdapter())
  const [connected, setConnected] = useState(false)
  const [candyMachineId, setCandyMachineId] = useState('')

  async function connectWallet() {
    try {
      await wallet.connect()
      setConnected(true)
    } catch (err) {
      console.error('Connection failed:', err)
    }
  }

  async function disconnectWallet() {
    await wallet.disconnect()
    setConnected(false)
    setCandyMachineId('')
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui' }}>
      <h1>Candy Machine UI</h1>
      <p style={{ color: '#666' }}>Create and mint from Candy Machines using ts-tokens</p>

      <div style={{ marginBottom: '1.5rem' }}>
        {connected ? (
          <>
            <p>Connected: {wallet.publicKey?.toBase58()}</p>
            <button onClick={disconnectWallet}>Disconnect</button>
          </>
        ) : (
          <button onClick={connectWallet}>Connect Phantom</button>
        )}
      </div>

      {connected && !candyMachineId && (
        <CreateCandyMachine onCreated={setCandyMachineId} />
      )}

      {connected && candyMachineId && (
        <div>
          <p>Candy Machine: <code>{candyMachineId}</code></p>
          <MintButton candyMachineId={candyMachineId} />
        </div>
      )}
    </div>
  )
}

export default App
