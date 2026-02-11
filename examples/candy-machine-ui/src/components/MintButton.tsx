import { useState } from 'react'

interface Props {
  candyMachineId: string
}

export function MintButton({ candyMachineId }: Props) {
  const [status, setStatus] = useState('')
  const [minting, setMinting] = useState(false)

  async function handleMint() {
    setMinting(true)
    setStatus('Minting from Candy Machine...')

    try {
      // In a real app, call mintFromCandyMachine from ts-tokens:
      //
      // import { mintFromCandyMachine } from 'ts-tokens'
      // const result = await mintFromCandyMachine(candyMachineId, config)
      //
      setStatus(`Ready to mint from CM: ${candyMachineId}`)
    } catch (err) {
      setStatus(`Mint failed: ${err instanceof Error ? err.message : err}`)
    } finally {
      setMinting(false)
    }
  }

  return (
    <div>
      <button onClick={handleMint} disabled={minting}>
        {minting ? 'Minting...' : 'Mint NFT'}
      </button>
      {status && <p>{status}</p>}
    </div>
  )
}
