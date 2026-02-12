import React from 'react'
import type { CommonProps } from '../types'
import { useDAO } from '../hooks/useDAO'

export interface GovernanceStatsProps extends CommonProps {
  daoAddress: string
}

export function GovernanceStats({ daoAddress, className, style }: GovernanceStatsProps): JSX.Element {
  const { name, proposalCount, totalVotingPower, config, loading, error } = useDAO(daoAddress)

  if (loading) return <div className={className} style={style} aria-busy={true}>Loading...</div>
  if (error) return <div className={className} style={style} role="alert">Error</div>

  return (
    <div className={className} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', ...style }} aria-label="Governance statistics">
      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>DAO</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{name ?? 'Unknown'}</div>
      </div>
      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Proposals</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{proposalCount}</div>
      </div>
      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Voting Power</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{totalVotingPower.toString()}</div>
      </div>
      <div style={{ padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: '#666' }}>Quorum</div>
        <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{config?.quorum ?? 0}%</div>
      </div>
    </div>
  )
}
