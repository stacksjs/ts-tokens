/**
 * Test environment setup for bun:test with happy-dom
 *
 * Registers happy-dom globals (document, window, navigator, etc.)
 * so that React and @testing-library/react can render components.
 * This file is preloaded via bunfig.toml [test] preload.
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
