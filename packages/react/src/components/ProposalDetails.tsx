import React from 'react'
import type { CommonProps } from '../types'

export interface ProposalDetailsProps extends CommonProps {
  address: string
  title: string
  description: string
  status: string
  proposer: string
  forVotes: bigint
  againstVotes: bigint
  abstainVotes: bigint
  startTime: bigint
  endTime: bigint
}

export function ProposalDetails({ address, title, description, status, proposer, forVotes, againstVotes, abstainVotes, startTime, endTime, className, style }: ProposalDetailsProps): JSX.Element {
  const totalVotes = forVotes + againstVotes + abstainVotes

  return (
    <div className={className} style={{ padding: '16px', ...style }} role="article" aria-label={`Proposal details: ${title}`}>
      <h2 style={{ margin: '0 0 4px' }}>{title}</h2>
      <span style={{ padding: '2px 8px', borderRadius: '4px', background: '#f0f0f0', fontSize: '12px' }}>{status}</span>
      <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>Proposed by: {proposer.slice(0, 8)}...</p>
      <p style={{ marginTop: '12px' }}>{description}</p>
      <div style={{ marginTop: '16px' }}>
        <h4 style={{ margin: '0 0 8px' }}>Votes</h4>
        <div style={{ fontSize: '14px' }}>
          <div>For: {forVotes.toString()}</div>
          <div>Against: {againstVotes.toString()}</div>
          <div>Abstain: {abstainVotes.toString()}</div>
          <div style={{ marginTop: '4px', fontWeight: 'bold' }}>Total: {totalVotes.toString()}</div>
        </div>
      </div>
    </div>
  )
}
