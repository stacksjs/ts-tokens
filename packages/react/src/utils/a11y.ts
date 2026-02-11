/**
 * Accessibility Utilities for React Components
 *
 * WCAG 2.1 AA helpers: keyboard navigation, screen reader announcements,
 * high contrast mode, and reduced motion support.
 */

import { useEffect, useRef, useCallback, useState } from 'react'

/**
 * Live region announcer for screen readers
 * Creates and manages an aria-live region for dynamic content updates
 */
let announcer: HTMLDivElement | null = null

function getAnnouncer(): HTMLDivElement {
  if (announcer) return announcer
  if (typeof document === 'undefined') return null as any

  announcer = document.createElement('div')
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  announcer.setAttribute('role', 'status')
  Object.assign(announcer.style, {
    position: 'absolute',
    width: '1px',
    height: '1px',
    padding: '0',
    margin: '-1px',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    whiteSpace: 'nowrap',
    border: '0',
  })
  document.body.appendChild(announcer)
  return announcer
}

/**
 * Announce a message to screen readers
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = getAnnouncer()
  if (!el) return
  el.setAttribute('aria-live', priority)
  el.textContent = ''
  // Small delay ensures screen readers pick up the change
  requestAnimationFrame(() => {
    el.textContent = message
  })
}

/**
 * Hook for announcing transaction status changes
 */
export function useTransactionAnnouncer() {
  return {
    announceSubmitted: (sig: string) =>
      announce(`Transaction submitted. Signature: ${sig.slice(0, 8)}`),
    announceConfirmed: (sig: string) =>
      announce(`Transaction confirmed. Signature: ${sig.slice(0, 8)}`, 'assertive'),
    announceFailed: (error: string) =>
      announce(`Transaction failed: ${error}`, 'assertive'),
    announceStatus: (message: string) => announce(message),
  }
}

/**
 * Hook for keyboard navigation within a component
 * Manages focus within a container element using arrow keys
 */
export function useKeyboardNavigation(options?: {
  orientation?: 'horizontal' | 'vertical' | 'both'
  loop?: boolean
}) {
  const containerRef = useRef<HTMLElement>(null)
  const { orientation = 'vertical', loop = true } = options ?? {}

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const container = containerRef.current
    if (!container) return

    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      )
    )

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement)
    if (currentIndex === -1) return

    let nextIndex = currentIndex

    const isNext = (orientation === 'vertical' && e.key === 'ArrowDown')
      || (orientation === 'horizontal' && e.key === 'ArrowRight')
      || (orientation === 'both' && (e.key === 'ArrowDown' || e.key === 'ArrowRight'))

    const isPrev = (orientation === 'vertical' && e.key === 'ArrowUp')
      || (orientation === 'horizontal' && e.key === 'ArrowLeft')
      || (orientation === 'both' && (e.key === 'ArrowUp' || e.key === 'ArrowLeft'))

    if (isNext) {
      e.preventDefault()
      nextIndex = loop
        ? (currentIndex + 1) % focusable.length
        : Math.min(currentIndex + 1, focusable.length - 1)
    } else if (isPrev) {
      e.preventDefault()
      nextIndex = loop
        ? (currentIndex - 1 + focusable.length) % focusable.length
        : Math.max(currentIndex - 1, 0)
    } else if (e.key === 'Home') {
      e.preventDefault()
      nextIndex = 0
    } else if (e.key === 'End') {
      e.preventDefault()
      nextIndex = focusable.length - 1
    }

    if (nextIndex !== currentIndex) {
      focusable[nextIndex]?.focus()
    }
  }, [orientation, loop])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return containerRef
}

/**
 * Hook to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}

/**
 * Hook to detect if user prefers high contrast
 */
export function usePrefersHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(forced-colors: active)').matches
      || window.matchMedia('(-ms-high-contrast: active)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(forced-colors: active)')
    const handler = (e: MediaQueryListEvent) => setPrefersHighContrast(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersHighContrast
}

/**
 * Visually hidden styles for screen-reader-only text
 */
export const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/**
 * Get ARIA props for a loading state
 */
export function getLoadingAriaProps(loading: boolean): Record<string, string | boolean> {
  return {
    'aria-busy': loading,
    ...(loading ? { 'aria-label': 'Loading' } : {}),
  }
}

/**
 * Get ARIA props for an error state
 */
export function getErrorAriaProps(error: string | null): Record<string, string> {
  if (!error) return {}
  return {
    role: 'alert',
    'aria-live': 'assertive',
  }
}
