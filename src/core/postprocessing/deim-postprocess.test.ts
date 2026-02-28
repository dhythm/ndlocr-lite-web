import { describe, it, expect } from 'vitest'
import { deimPostprocess } from './deim-postprocess.ts'

describe('deimPostprocess', () => {
  it('filters detections below confidence threshold', () => {
    const outputs = {
      labels: new Float32Array([1, 2, 3]),
      boxes: new Float32Array([
        0.1, 0.1, 0.5, 0.5, // box 1
        0.2, 0.2, 0.6, 0.6, // box 2
        0.3, 0.3, 0.7, 0.7, // box 3
      ]),
      scores: new Float32Array([0.9, 0.1, 0.8]), // box 2 below threshold
    }

    const result = deimPostprocess(outputs, { height: 100, width: 200 }, 0.25)

    expect(result).toHaveLength(2) // box 2 filtered out
    expect(result[0].score).toBeCloseTo(0.9)
    expect(result[1].score).toBeCloseTo(0.8)
  })

  it('scales boxes from normalized [0,1] to original image coordinates', () => {
    const outputs = {
      labels: new Float32Array([1]),
      boxes: new Float32Array([0.0, 0.0, 1.0, 1.0]),
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(outputs, { height: 500, width: 1000 }, 0.25)

    expect(result[0].bbox.x1).toBeCloseTo(0)
    expect(result[0].bbox.y1).toBeCloseTo(0)
    expect(result[0].bbox.x2).toBeCloseTo(1000)
    expect(result[0].bbox.y2).toBeCloseTo(500)
  })

  it('converts 1-indexed labels to 0-indexed categoryIndex', () => {
    const outputs = {
      labels: new Float32Array([5]),
      boxes: new Float32Array([0.1, 0.1, 0.5, 0.5]),
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(outputs, { height: 100, width: 100 }, 0.25)

    expect(result[0].categoryIndex).toBe(4) // 5 - 1 = 4
  })

  it('maps category index to category name', () => {
    const outputs = {
      labels: new Float32Array([2]), // line_main → column
      boxes: new Float32Array([0.1, 0.1, 0.5, 0.5]),
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(outputs, { height: 100, width: 100 }, 0.25)

    expect(result[0].category).toBe('column') // index 1 = column
  })

  it('returns empty array for no detections', () => {
    const outputs = {
      labels: new Float32Array([]),
      boxes: new Float32Array([]),
      scores: new Float32Array([]),
    }

    const result = deimPostprocess(outputs, { height: 100, width: 100 }, 0.25)

    expect(result).toHaveLength(0)
  })

  it('includes predCharCount when available', () => {
    const outputs = {
      labels: new Float32Array([1]),
      boxes: new Float32Array([0.1, 0.1, 0.5, 0.5]),
      scores: new Float32Array([0.9]),
      charCounts: new Float32Array([3]),
    }

    const result = deimPostprocess(outputs, { height: 100, width: 100 }, 0.25)

    expect(result[0].predCharCount).toBe(3)
  })
})
