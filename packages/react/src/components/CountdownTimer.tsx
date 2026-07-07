import React, { useState, useEffect, useRef } from 'react'
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

  // Keep onComplete in a ref so an inline callback from the parent does not tear
  // down and recreate the interval on every parent render (which would freeze
  // the countdown when the parent re-renders more than once per second).
  const onCompleteRef = useRef(onComplete)
  useEffect(() => { onCompleteRef.current = onComplete }, [onComplete])

  useEffect(() => {
    // Reset immediately so a changed targetDate is reflected without waiting for
    // the first tick.
    setRemaining(targetDate.getTime() - Date.now())

    const interval = setInterval(() => {
      const diff = targetDate.getTime() - Date.now()
      setRemaining(diff)

      if (diff <= 0) {
        clearInterval(interval)
        onCompleteRef.current?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [targetDate])

  return (
    <span className={className} style={{ fontVariantNumeric: 'tabular-nums', ...style }} role="timer" aria-live="polite" aria-label={remaining <= 0 ? 'Countdown complete, now live' : `Time remaining: ${formatTime(remaining)}`}>
      {remaining <= 0 ? 'Live!' : formatTime(remaining)}
    </span>
  )
}
