import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeAll } from 'vitest'
import App from './App.tsx'

// Mock Worker for test environment
beforeAll(() => {
  // @ts-expect-error Worker mock
  globalThis.Worker = vi.fn(() => ({
    postMessage: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    terminate: vi.fn(),
    onmessage: null,
    onerror: null,
  }))
})

describe('App', () => {
  it('renders the title', () => {
    render(<App />)
    expect(screen.getByText('NDL OCR Lite Web')).toBeInTheDocument()
  })
})
