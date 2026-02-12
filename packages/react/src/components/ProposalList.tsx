import React from 'react'
import type { CommonProps } from '../types'
import { useProposals } from '../hooks/useProposals'

export interface ProposalListProps extends CommonProps {
  daoAddress: string
  limit?: number
}

export function ProposalList({ daoAddress, limit = 10, className, style }: ProposalListProps): JSX.Element {
  const { proposals, loading, error } = useProposals(daoAddress)

  if (loading) return <div className={className} style={style} aria-busy={true}>Loading proposals...</div>
  if (error) return <div className={className} style={style} role="alert">Error loading proposals</div>
  if (proposals.length === 0) return <div className={className} style={style}>No proposals found</div>

  return (
    <ul className={className} style={{ listStyle: 'none', padding: 0, ...style }} role="list" aria-label="Proposals">
      {proposals.slice(0, limit).map((p) => (
        <li key={p.address} style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
          <strong>{p.title}</strong>
          <span style={{ marginLeft: '8px', color: '#666' }}>{p.status}</span>
        </li>
      ))}
    </ul>
  )
}
