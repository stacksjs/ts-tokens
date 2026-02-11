import React, { useState, useEffect } from 'react'
import type { CommonProps } from '../types'

export interface CountdownTimerProps extends CommonProps {
  targetDate: Date
  onComplete?: () => void
}

function formatTime(ms: number): string {
  if (ms <= 0) return '00:00:00'

  const totalSeconds = Math.floor(ms / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  const pad = (n: number) => n.toString().padStart(2, '0')

  if (days > 0) {
    return `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

export function CountdownTimer({ targetDate, onComplete, className, style }: CountdownTimerProps): JSX.Element {
  const [remaining, setRemaining] = useState(() => targetDate.getTime() - Date.now())

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now()
      setRemaining(diff)

      if (diff <= 0) {
        clearInterval(interval)
        onComplete?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate, onComplete])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }}>
      {remaining <= 0 ? 'Live!' : formatTime(remaining)}
    </span>
  )
}
