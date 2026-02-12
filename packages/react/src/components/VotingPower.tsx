import React from 'react'
import type { CommonProps } from '../types'
import { useVotingPower } from '../hooks/useVotingPower'

export interface VotingPowerProps extends CommonProps {
  daoAddress: string
  voterAddress: string
}

export function VotingPower({ daoAddress, voterAddress, className, style }: VotingPowerProps): JSX.Element {
  const { ownPower, delegatedPower, totalPower, loading, error } = useVotingPower(daoAddress, voterAddress)

  if (loading) return <span className={className} style={style} aria-busy={true}>...</span>
  if (error) return <span className={className} style={style} role="alert">Error</span>

  return (
    <div className={className} style={style} aria-label={`Voting power: ${totalPower.toString()}`}>
      <div>Own: {ownPower.toString()}</div>
      <div>Delegated: {delegatedPower.toString()}</div>
      <div style={{ fontWeight: 'bold' }}>Total: {totalPower.toString()}</div>
    </div>
  )
}
