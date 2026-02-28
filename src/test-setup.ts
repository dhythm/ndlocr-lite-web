import '@testing-library/jest-dom/vitest'

// pdfjs-dist requires DOMMatrix which is not available in jsdom
if (typeof globalThis.DOMMatrix === 'undefined') {
  // @ts-expect-error minimal polyfill for test environment
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { return this }
  }
}
