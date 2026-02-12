import React from 'react'
import type { CommonProps } from '../types'

export interface ProposalCardProps extends CommonProps {
  title: string
  status: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  endTime: bigint
}

export function ProposalCard({ title, status, forVotes, againstVotes, abstainVotes, endTime, className, style }: ProposalCardProps): JSX.Element {
  const totalVotes = forVotes + againstVotes + abstainVotes
  const forPct = totalVotes > 0n ? Number((forVotes * 100n) / totalVotes) : 0

  return (
    <div className={className} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '16px', ...style }} role="article" aria-label={`Proposal: ${title}`}>
      <h3 style={{ margin: '0 0 8px' }}>{title}</h3>
      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f0f0f0', fontSize: '12px' }}>{status}</span>
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
          <span>For: {forPct}%</span>
          <span>Total: {totalVotes.toString()}</span>
        </div>
        <div style={{ height: '4px', background: '#eee', borderRadius: '2px', marginTop: '4px' }}>
          <div style={{ height: '100%', width: `${forPct}%`, background: '#22c55e', borderRadius: '2px' }} />
        </div>
      </div>
    </div>
  )
}
