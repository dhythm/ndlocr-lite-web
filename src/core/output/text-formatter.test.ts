import { describe, it, expect } from 'vitest'
import { formatAsText } from './text-formatter.ts'
import type { OcrResult } from '../pipeline/types.ts'

function makeResult(texts: string[][]): OcrResult {
  return {
    pages: texts.map(pageTexts => ({
      width: 100,
      height: 100,
      detections: [],
      regions: pageTexts.map((text, i) => ({
        bbox: { x1: 0, y1: i * 20, x2: 100, y2: (i + 1) * 20 },
        category: 'body' as const,
        readingOrder: i,
        lines: text.split('\n').map((line, j) => ({
          text: line,
          bbox: { x1: 0, y1: i * 20 + j * 10, x2: 100, y2: i * 20 + (j + 1) * 10 },
          confidence: 0.9,
        })),
      })),
    })),
  }
}

describe('formatAsText', () => {
  it('returns concatenated text from all regions in order', () => {
    const result = makeResult([['Hello', 'World']])
    const text = formatAsText(result)
    expect(text).toBe('Hello\nWorld')
  })

  it('handles multi-page results', () => {
    const result = makeResult([['Page 1 text'], ['Page 2 text']])
    const text = formatAsText(result)
    expect(text).toContain('Page 1 text')
    expect(text).toContain('Page 2 text')
  })

  it('returns empty string for empty result', () => {
    const result: OcrResult = { pages: [] }
    const text = formatAsText(result)
    expect(text).toBe('')
  })
})
