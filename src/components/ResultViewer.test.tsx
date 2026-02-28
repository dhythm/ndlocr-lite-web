import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ResultViewer } from './ResultViewer.tsx'
import type { OcrResult } from '../core/pipeline/types.ts'

const mockResult: OcrResult = {
  pages: [{
    width: 200,
    height: 100,
    regions: [
      {
        bbox: { x1: 0, y1: 0, x2: 200, y2: 50 },
        category: 'body',
        readingOrder: 0,
        lines: [
          { text: '一行目テスト', bbox: { x1: 0, y1: 0, x2: 200, y2: 25 }, confidence: 0.95 },
          { text: '二行目テスト', bbox: { x1: 0, y1: 25, x2: 200, y2: 50 }, confidence: 0.88 },
        ],
      },
      {
        bbox: { x1: 0, y1: 50, x2: 200, y2: 100 },
        category: 'caption',
        readingOrder: 1,
        lines: [
          { text: 'キャプション', bbox: { x1: 0, y1: 50, x2: 200, y2: 100 }, confidence: 0.92 },
        ],
      },
    ],
    detections: [
      { bbox: { x1: 0, y1: 0, x2: 200, y2: 50 }, category: 'body', categoryIndex: 0, score: 0.9 },
    ],
  }],
}

// Create a minimal data URL for testing
const testImageUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

describe('ResultViewer', () => {
  it('renders recognized text lines', () => {
    render(<ResultViewer result={mockResult} imageUrls={[testImageUrl]} />)

    expect(screen.getByText('一行目テスト')).toBeInTheDocument()
    expect(screen.getByText('二行目テスト')).toBeInTheDocument()
    expect(screen.getByText('キャプション')).toBeInTheDocument()
  })

  it('displays confidence scores', () => {
    render(<ResultViewer result={mockResult} imageUrls={[testImageUrl]} />)

    expect(screen.getByText('95.0%')).toBeInTheDocument()
    expect(screen.getByText('88.0%')).toBeInTheDocument()
  })

  it('renders bounding box checkbox', () => {
    render(<ResultViewer result={mockResult} imageUrls={[testImageUrl]} />)

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeChecked()
  })

  it('does not show pagination for single page', () => {
    render(<ResultViewer result={mockResult} imageUrls={[testImageUrl]} />)

    expect(screen.queryByText(/前へ/)).not.toBeInTheDocument()
    expect(screen.queryByText(/次へ/)).not.toBeInTheDocument()
  })

  it('shows pagination for multi-page results', () => {
    const multiPageResult: OcrResult = {
      pages: [mockResult.pages[0], { ...mockResult.pages[0] }],
    }
    render(
      <ResultViewer
        result={multiPageResult}
        imageUrls={[testImageUrl, testImageUrl]}
      />,
    )

    expect(screen.getByText('1 / 2 ページ')).toBeInTheDocument()
    expect(screen.getByText('前へ')).toBeDisabled()
    expect(screen.getByText('次へ')).not.toBeDisabled()
  })

  it('navigates between pages', () => {
    const multiPageResult: OcrResult = {
      pages: [
        mockResult.pages[0],
        {
          ...mockResult.pages[0],
          regions: [{
            bbox: { x1: 0, y1: 0, x2: 200, y2: 50 },
            category: 'body',
            readingOrder: 0,
            lines: [{ text: '2ページ目', bbox: { x1: 0, y1: 0, x2: 200, y2: 50 }, confidence: 0.9 }],
          }],
        },
      ],
    }

    render(
      <ResultViewer
        result={multiPageResult}
        imageUrls={[testImageUrl, testImageUrl]}
      />,
    )

    expect(screen.getByText('一行目テスト')).toBeInTheDocument()

    fireEvent.click(screen.getByText('次へ'))

    expect(screen.getByText('2 / 2 ページ')).toBeInTheDocument()
    expect(screen.getByText('2ページ目')).toBeInTheDocument()
  })

  it('shows message when no text detected', () => {
    const emptyResult: OcrResult = {
      pages: [{
        width: 200,
        height: 100,
        regions: [],
        detections: [],
      }],
    }

    render(<ResultViewer result={emptyResult} imageUrls={[testImageUrl]} />)
    expect(screen.getByText('テキストが検出されませんでした')).toBeInTheDocument()
  })
})
