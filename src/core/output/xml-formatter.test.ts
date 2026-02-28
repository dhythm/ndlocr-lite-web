import { describe, it, expect } from 'vitest'
import { formatAsXml } from './xml-formatter.ts'
import type { OcrResult } from '../pipeline/types.ts'

describe('formatAsXml', () => {
  it('returns valid XML string with PAGE format', () => {
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

    const xml = formatAsXml(result)

    expect(xml).toContain('<?xml version="1.0"')
    expect(xml).toContain('<Page')
    expect(xml).toContain('テスト')
    expect(xml).toContain('</Page>')
  })

  it('escapes special XML characters', () => {
    const result: OcrResult = {
      pages: [{
        width: 100,
        height: 100,
        detections: [],
        regions: [{
          bbox: { x1: 0, y1: 0, x2: 100, y2: 100 },
          category: 'body',
          readingOrder: 0,
          lines: [{
            text: '<tag>&"value"</tag>',
            bbox: { x1: 0, y1: 0, x2: 100, y2: 100 },
            confidence: 0.9,
          }],
        }],
      }],
    }

    const xml = formatAsXml(result)
    expect(xml).toContain('&lt;tag&gt;&amp;&quot;value&quot;&lt;/tag&gt;')
  })
})
