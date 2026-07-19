import { useState } from 'react'

interface Props {
  candyMachineId: string
}

export function MintButton({ candyMachineId }: Props) {
  const [status, setStatus] = useState('')
  const [minting, setMinting] = useState(false)

  async function handleMint() {
    setMinting(true)
    setStatus('Simulating mint (dry run)...')

    try {
      // In a real app, call mintFromCandyMachine from ts-tokens:
      //
      // import { mintFromCandyMachine } from 'ts-tokens'
      // const result = await mintFromCandyMachine(candyMachineId, config)
      //
      setStatus(`Dry run for Candy Machine: ${candyMachineId} — no transaction was sent (mint simulated)`)
    } catch (err) {
      setStatus(`Mint failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setMinting(false)
    }
  }

  return (
    <div>
      <button onClick={handleMint} disabled={minting}>
        {minting ? 'Simulating...' : 'Dry run — mint simulated'}
      </button>
      {status && <p>{status}</p>}
    </div>
  )
}
