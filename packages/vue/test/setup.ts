import { GlobalWindow } from 'happy-dom'

const window = new GlobalWindow()

// Register happy-dom globals for @vue/test-utils
const globals = [
  'document',
  'navigator',
  'location',
  'HTMLElement',
  'SVGElement',
  'Element',
  'Node',
  'Text',
  'Comment',
  'DocumentFragment',
  'Event',
  'CustomEvent',
  'MouseEvent',
  'KeyboardEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
  'DOMParser',
  'XMLSerializer',
  'NodeFilter',
] as const

for (const key of globals) {
  if ((window as any)[key] !== undefined && (globalThis as any)[key] === undefined) {
    ;(globalThis as any)[key] = (window as any)[key]
  }
}

// Ensure window is available globally
if (typeof globalThis.window === 'undefined') {
  ;(globalThis as any).window = window
}
