import React, { createContext, useContext } from 'react'
import { useDAO } from '../hooks/useDAO'
import type { DAOState } from '../hooks/useDAO'

const DAOContext = createContext<DAOState | null>(null)

export function useDAOContext(): DAOState {
  const ctx = useContext(DAOContext)
  if (!ctx) throw new Error('useDAOContext must be used within a DAOProvider')
  return ctx
}

export interface DAOProviderProps {
  daoAddress: string
  children: React.ReactNode
}

export function DAOProvider({ daoAddress, children }: DAOProviderProps): JSX.Element {
  const daoState = useDAO(daoAddress)
  return <DAOContext.Provider value={daoState}>{children}</DAOContext.Provider>
}
