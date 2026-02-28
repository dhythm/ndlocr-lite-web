import { describe, it, expect } from 'vitest'
import { solveReadingOrder } from './xy-cut.ts'
import type { BoundingBox } from '../pipeline/types.ts'

function box(x1: number, y1: number, x2: number, y2: number): BoundingBox {
  return { x1, y1, x2, y2 }
}

describe('solveReadingOrder', () => {
  it('returns empty array for no boxes', () => {
    const result = solveReadingOrder([])
    expect(result).toEqual([])
  })

  it('returns [0] for a single box', () => {
    const result = solveReadingOrder([box(10, 10, 100, 50)])
    expect(result).toEqual([0])
  })

  it('orders top-to-bottom for horizontal text', () => {
    // Three horizontal lines stacked vertically (landscape boxes = horizontal text)
    const boxes = [
      box(10, 10, 200, 30),   // top line
      box(10, 40, 200, 60),   // middle line
      box(10, 70, 200, 90),   // bottom line
    ]
    const result = solveReadingOrder(boxes)

    // Top line should come first
    expect(result[0]).toBeLessThan(result[1])
    expect(result[1]).toBeLessThan(result[2])
  })

  it('orders right-to-left for vertical text', () => {
    // Three vertical lines side by side (portrait boxes = vertical text)
    const boxes = [
      box(10, 10, 30, 200),   // left column
      box(40, 10, 60, 200),   // middle column
      box(70, 10, 90, 200),   // right column
    ]
    const result = solveReadingOrder(boxes)

    // Right column should come first (vertical text reads right-to-left)
    expect(result[2]).toBeLessThan(result[1])
    expect(result[1]).toBeLessThan(result[0])
  })

  it('handles two-column layout', () => {
    // Two columns with horizontal text
    const boxes = [
      box(10, 10, 200, 30),   // left col, line 1
      box(10, 40, 200, 60),   // left col, line 2
      box(250, 10, 450, 30),  // right col, line 1
      box(250, 40, 450, 60),  // right col, line 2
    ]
    const result = solveReadingOrder(boxes)

    // Left column lines should come before right column
    expect(result[0]).toBeLessThan(result[2])
    expect(result[1]).toBeLessThan(result[3])
    // Within left column, top before bottom
    expect(result[0]).toBeLessThan(result[1])
  })

  it('handles grid layout', () => {
    // 2x2 grid of boxes
    const boxes = [
      box(10, 10, 100, 50),    // top-left
      box(150, 10, 250, 50),   // top-right
      box(10, 100, 100, 150),  // bottom-left
      box(150, 100, 250, 150), // bottom-right
    ]
    const result = solveReadingOrder(boxes)

    // All boxes should get assigned a rank
    expect(result).toHaveLength(4)
    // All ranks should be unique
    expect(new Set(result).size).toBe(4)
    // All ranks should be non-negative
    for (const rank of result) {
      expect(rank).toBeGreaterThanOrEqual(0)
    }
  })

  it('assigns unique ranks to all boxes', () => {
    const boxes = [
      box(50, 50, 150, 80),
      box(200, 50, 300, 80),
      box(50, 100, 150, 130),
      box(200, 100, 300, 130),
      box(50, 150, 300, 180),
    ]
    const result = solveReadingOrder(boxes)

    expect(result).toHaveLength(5)
    const sorted = [...result].sort((a, b) => a - b)
    expect(sorted).toEqual([0, 1, 2, 3, 4])
  })
})
