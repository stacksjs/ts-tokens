/**
 * Test environment setup for bun:test with happy-dom
 *
 * Registers happy-dom globals (document, window, navigator, etc.)
 * so that React and @testing-library/react can render components.
 * This file is preloaded via bunfig.toml [test] preload.
 */

import { Window } from 'happy-dom'

const window = new Window({ url: 'http://localhost' })

// Assign essential DOM globals to globalThis
const domGlobals = [
  'document',
  'window',
  'navigator',
  'HTMLElement',
  'HTMLDivElement',
  'HTMLSpanElement',
  'HTMLAnchorElement',
  'HTMLImageElement',
  'HTMLButtonElement',
  'HTMLInputElement',
  'Element',
  'Node',
  'Text',
  'DocumentFragment',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'CustomEvent',
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
  'CSSStyleDeclaration',
] as const

for (const key of domGlobals) {
  if (key in window && !(key in globalThis)) {
    // @ts-expect-error -- assigning DOM globals to globalThis
    globalThis[key] = window[key]
  }
}

// Ensure document and window are always set
// @ts-expect-error -- assigning DOM globals
globalThis.document = window.document
// @ts-expect-error -- assigning DOM globals
globalThis.window = window

// Provide clipboard API for copy-related tests
if (!window.navigator.clipboard) {
  Object.defineProperty(window.navigator, 'clipboard', {
    value: {
      writeText: async (_text: string) => {},
      readText: async () => '',
    },
    writable: true,
  })
}
