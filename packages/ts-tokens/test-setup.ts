/**
 * Root-level test setup for bun:test
 *
 * Provides happy-dom globals so that React and Vue component tests
 * can run alongside Node-only tests when `bun test` is invoked from
 * the repository root.
 *
 * Non-DOM tests are unaffected since the DOM globals are additive.
 */

import { Window } from 'happy-dom'

const window = new Window({ url: 'http://localhost' })

// Bun does not fully support Node.js vm module, so happy-dom's
// VMGlobalPropertyScript never runs. We must manually assign native
// error constructors that happy-dom's internals (e.g. SelectorParser)
// expect to find on the Window object.
const nativeGlobals: Record<string, unknown> = {
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
  Array,
  Object,
  Function,
  RegExp,
  Number,
  String,
  Boolean,
  Symbol,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Promise,
  ArrayBuffer,
  DataView,
  Float32Array,
  Float64Array,
  Int8Array,
  Int16Array,
  Int32Array,
  Uint8Array,
  Uint16Array,
  Uint32Array,
  Uint8ClampedArray,
  JSON,
  Math,
  Reflect,
  Intl,
  Date,
  AbortController,
  AbortSignal,
}

for (const [key, value] of Object.entries(nativeGlobals)) {
  if ((window as any)[key] === undefined) {
    ;(window as any)[key] = value
  }
}

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
  'Comment',
  'DocumentFragment',
  'Event',
  'MouseEvent',
  'KeyboardEvent',
  'CustomEvent',
  'MutationObserver',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'DOMParser',
  'XMLSerializer',
  'CSSStyleDeclaration',
  'NodeFilter',
  'SVGElement',
] as const

for (const key of domGlobals) {
  if ((window as any)[key] !== undefined && (globalThis as any)[key] === undefined) {
    ;(globalThis as any)[key] = (window as any)[key]
  }
}

// Ensure document and window are always set
;(globalThis as any).document = window.document
;(globalThis as any).window = window

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
