import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ExportButton } from './ExportButton.tsx'
import type { OcrResult } from '../core/pipeline/types.ts'

const mockResult: OcrResult = {
  pages: [{
    width: 100,
    height: 100,
    regions: [{
      bbox: { x1: 0, y1: 0, x2: 100, y2: 50 },
      category: 'body',
      readingOrder: 0,
      lines: [{
        text: 'テストテキスト',
        bbox: { x1: 0, y1: 0, x2: 100, y2: 25 },
        confidence: 0.95,
      }],
    }],
    detections: [],
  }],
}

describe('ExportButton', () => {
  it('renders all export format buttons', () => {
    render(<ExportButton result={mockResult} />)

    expect(screen.getByText('TXT')).toBeInTheDocument()
    expect(screen.getByText('JSON')).toBeInTheDocument()
    expect(screen.getByText('XML')).toBeInTheDocument()
  })

  it('triggers download on button click', () => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    const createObjectURL = vi.fn(() => 'blob:mock')
    const revokeObjectURL = vi.fn()
    globalThis.URL.createObjectURL = createObjectURL
    globalThis.URL.revokeObjectURL = revokeObjectURL

    // Mock anchor element click
    const clickSpy = vi.fn()
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return { click: clickSpy, href: '', download: '' } as unknown as HTMLElement
      }
      return origCreateElement(tag)
    })

    render(<ExportButton result={mockResult} />)

    screen.getByText('TXT').click()

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalled()

    vi.restoreAllMocks()
  })
})
