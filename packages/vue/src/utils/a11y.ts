/**
 * Accessibility Utilities for Vue Components
 *
 * WCAG 2.1 AA helpers: keyboard navigation, screen reader announcements,
 * high contrast mode, and reduced motion support.
 */

import { ref, onMounted, onUnmounted, type Ref } from 'vue'

/**
 * Live region announcer for screen readers
 */
let announcer: HTMLDivElement | null = null

function getAnnouncer(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null
  if (announcer) return announcer

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

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const el = getAnnouncer()
  if (!el) return
  el.setAttribute('aria-live', priority)
  el.textContent = ''
  requestAnimationFrame(() => {
    el.textContent = message
  })
}

/**
 * Composable for announcing transaction status changes
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
 * Composable for keyboard navigation within a container
 */
export function useKeyboardNavigation(options?: {
  orientation?: 'horizontal' | 'vertical' | 'both'
  loop?: boolean
}) {
  const containerRef = ref<HTMLElement | null>(null) as Ref<HTMLElement | null>
  const { orientation = 'vertical', loop = true } = options ?? {}

  function handleKeyDown(e: KeyboardEvent) {
    const container = containerRef.value
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
  }

  onMounted(() => {
    containerRef.value?.addEventListener('keydown', handleKeyDown)
  })

  onUnmounted(() => {
    containerRef.value?.removeEventListener('keydown', handleKeyDown)
  })

  return containerRef
}

/**
 * Composable to detect if user prefers reduced motion
 */
export function usePrefersReducedMotion(): Ref<boolean> {
  const prefersReducedMotion = ref(false)

  onMounted(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    prefersReducedMotion.value = mq.matches
    const handler = (e: MediaQueryListEvent) => { prefersReducedMotion.value = e.matches }
    mq.addEventListener('change', handler)
    onUnmounted(() => mq.removeEventListener('change', handler))
  })

  return prefersReducedMotion
}

/**
 * Composable to detect if user prefers high contrast
 */
export function usePrefersHighContrast(): Ref<boolean> {
  const prefersHighContrast = ref(false)

  onMounted(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(forced-colors: active)')
    prefersHighContrast.value = mq.matches
    const handler = (e: MediaQueryListEvent) => { prefersHighContrast.value = e.matches }
    mq.addEventListener('change', handler)
    onUnmounted(() => mq.removeEventListener('change', handler))
  })

  return prefersHighContrast
}

/**
 * Visually hidden styles for screen-reader-only text
 */
export const srOnlyStyle = {
  position: 'absolute' as const,
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden' as const,
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap' as const,
  border: '0',
}
