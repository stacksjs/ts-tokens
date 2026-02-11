import { useState } from 'react'

interface Props {
  onCreated: (id: string) => void
}

export function CreateCandyMachine({ onCreated }: Props) {
  const [itemsAvailable, setItemsAvailable] = useState(10)
  const [symbol, setSymbol] = useState('CM')
  const [sellerFee, setSellerFee] = useState(500)
  const [status, setStatus] = useState('')

  async function handleCreate() {
    setStatus('Creating Candy Machine...')

    try {
      // In a real app, call createCandyMachine from ts-tokens:
      //
      // import { createCandyMachine } from 'ts-tokens'
      // const result = await createCandyMachine({ ... }, config)
      //
      // For this demo we simulate the response.
      setStatus(`Ready to create CM with ${itemsAvailable} items, symbol "${symbol}", fee ${sellerFee}bps`)
      onCreated('DEMO_CANDY_MACHINE_ADDRESS')
    } catch (err) {
      setStatus(`Failed: ${err instanceof Error ? err.message : err}`)
    }
  }

  return (
    <div>
      <h2>Create Candy Machine</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          type="number"
          placeholder="Items Available"
          value={itemsAvailable}
          onChange={(e) => setItemsAvailable(Number(e.target.value))}
        />
        <input
          type="text"
          placeholder="Symbol"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          type="number"
          placeholder="Seller Fee (bps)"
          value={sellerFee}
          onChange={(e) => setSellerFee(Number(e.target.value))}
        />
        <button onClick={handleCreate}>Create Candy Machine</button>
      </div>
      {status && <p>{status}</p>}
    </div>
  )
}
