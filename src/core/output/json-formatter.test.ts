import { describe, it, expect } from 'vitest'
import { formatAsJson } from './json-formatter.ts'
import type { OcrResult } from '../pipeline/types.ts'

describe('formatAsJson', () => {
  it('returns valid JSON string', () => {
    const result: OcrResult = {
      pages: [{
        width: 200,
        height: 300,
        detections: [],
        regions: [{
          bbox: { x1: 10, y1: 20, x2: 190, y2: 50 },
          category: 'body',
          readingOrder: 0,
          lines: [{
            text: 'テスト',
            bbox: { x1: 10, y1: 20, x2: 190, y2: 50 },
            confidence: 0.95,
          }],
        }],
      }],
    }

    const json = formatAsJson(result)
    const parsed = JSON.parse(json)

    expect(parsed.pages).toHaveLength(1)
    expect(parsed.pages[0].regions[0].lines[0].text).toBe('テスト')
  })

  it('returns empty pages array for empty result', () => {
    const result: OcrResult = { pages: [] }
    const json = formatAsJson(result)
    const parsed = JSON.parse(json)
    expect(parsed.pages).toEqual([])
  })
})
