import React, { useState } from 'react'
import type { CommonProps } from '../types'

export interface VoteButtonProps extends CommonProps {
  proposalAddress: string
  voteType: 'for' | 'against' | 'abstain'
  onVote?: (voteType: string) => void
  disabled?: boolean
}

export function VoteButton({ proposalAddress, voteType, onVote, disabled = false, className, style }: VoteButtonProps): JSX.Element {
  const [submitting, setSubmitting] = useState(false)

  const colors = { for: '#22c55e', against: '#ef4444', abstain: '#6b7280' }
  const labels = { for: 'Vote For', against: 'Vote Against', abstain: 'Abstain' }

  const handleClick = async () => {
    setSubmitting(true)
    try {
      onVote?.(voteType)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <button
      className={className}
      style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: colors[voteType], color: 'white', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, ...style }}
      onClick={handleClick}
      disabled={disabled || submitting}
      aria-label={`${labels[voteType]} on proposal`}
    >
      {submitting ? 'Submitting...' : labels[voteType]}
    </button>
  )
}
