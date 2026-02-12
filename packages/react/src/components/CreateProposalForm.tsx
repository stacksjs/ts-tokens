import React, { useState } from 'react'
import type { CommonProps } from '../types'

export interface CreateProposalFormProps extends CommonProps {
  daoAddress: string
  onSubmit?: (title: string, description: string) => void
}

export function CreateProposalForm({ daoAddress, onSubmit, className, style }: CreateProposalFormProps): JSX.Element {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (title) onSubmit?.(title, description)
  }

  return (
    <form className={className} style={style} onSubmit={handleSubmit} aria-label="Create proposal">
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="proposal-title" style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Title</label>
        <input id="proposal-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={100} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
      </div>
      <div style={{ marginBottom: '8px' }}>
        <label htmlFor="proposal-description" style={{ display: 'block', marginBottom: '4px', fontSize: '14px' }}>Description</label>
        <textarea id="proposal-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }} />
      </div>
      <button type="submit" style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer' }}>Create Proposal</button>
    </form>
  )
}
