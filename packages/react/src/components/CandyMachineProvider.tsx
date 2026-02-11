import React, { createContext, useContext, type ReactNode } from 'react'
import { useCandyMachine } from '../hooks'
import type { CandyMachineDisplayInfo } from '../types'

export interface CandyMachineContextValue {
  candyMachine: CandyMachineDisplayInfo | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

const CandyMachineContext = createContext<CandyMachineContextValue | null>(null)

export interface CandyMachineProviderProps {
  children: ReactNode
  candyMachine: string
}

export function CandyMachineProvider({ children, candyMachine: address }: CandyMachineProviderProps): JSX.Element {
  const state = useCandyMachine(address)

  return (
    <CandyMachineContext.Provider value={state}>
      {children}
    </CandyMachineContext.Provider>
  )
}

export function useCandyMachineContext(): CandyMachineContextValue {
  const context = useContext(CandyMachineContext)
  if (!context) {
    throw new Error('useCandyMachineContext must be used within a CandyMachineProvider')
  }
  return context
}
