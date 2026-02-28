import { describe, it, expect } from 'vitest'
import { deimPostprocess } from './deim-postprocess.ts'

describe('deimPostprocess', () => {
  it('filters detections below confidence threshold', () => {
    const outputs = {
      labels: new Float32Array([2, 3, 4]), // line classes (1-indexed: 2=column, 3=caption, 4=advertisement)
      boxes: new Float32Array([
        80, 80, 400, 400,    // box 1 in input pixel space [0, 800]
        160, 160, 480, 480,  // box 2
        240, 240, 560, 560,  // box 3
      ]),
      scores: new Float32Array([0.9, 0.1, 0.8]), // box 2 below threshold
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 1000, originalWidth: 1000, inputSize: 800 },
      0.3,
    )

    // box 2 filtered out by confidence
    expect(result.length).toBeLessThanOrEqual(2)
    expect(result.some(r => r.score === 0.1)).toBe(false)
  })

  it('scales boxes from input pixel space to original image space', () => {
    const outputs = {
      labels: new Float32Array([2]), // line_main → column
      boxes: new Float32Array([0, 0, 800, 800]),
      scores: new Float32Array([0.9]),
    }

    // Original image: 1000x1000, so maxWH=1000, scale = 1000/800 = 1.25
    const result = deimPostprocess(
      outputs,
      { originalHeight: 1000, originalWidth: 1000, inputSize: 800 },
      0.3,
    )

    expect(result).toHaveLength(1)
    expect(result[0].bbox.x1).toBe(0)
    expect(result[0].bbox.y1).toBe(0)
    expect(result[0].bbox.x2).toBe(1000)
    expect(result[0].bbox.y2).toBe(1000)
  })

  it('converts 1-indexed labels to 0-indexed categoryIndex', () => {
    const outputs = {
      labels: new Float32Array([6]), // 1-indexed 6 → 0-indexed 5 (line_note_tochu)
      boxes: new Float32Array([100, 100, 500, 500]),
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 800, originalWidth: 800, inputSize: 800 },
      0.3,
    )

    expect(result[0].categoryIndex).toBe(5) // 6 - 1 = 5
  })

  it('returns empty array for no detections', () => {
    const outputs = {
      labels: new Float32Array([]),
      boxes: new Float32Array([]),
      scores: new Float32Array([]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 100, originalWidth: 100, inputSize: 800 },
      0.3,
    )

    expect(result).toHaveLength(0)
  })

  it('includes predCharCount when available', () => {
    const outputs = {
      labels: new Float32Array([2]),
      boxes: new Float32Array([100, 100, 500, 500]),
      scores: new Float32Array([0.9]),
      charCounts: new Float32Array([3]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 800, originalWidth: 800, inputSize: 800 },
      0.3,
    )

    expect(result[0].predCharCount).toBe(3)
  })

  it('applies NMS to remove overlapping detections', () => {
    const outputs = {
      labels: new Float32Array([2, 2]), // same class
      boxes: new Float32Array([
        100, 100, 500, 500,  // box 1
        105, 105, 505, 505,  // box 2 (highly overlapping)
      ]),
      scores: new Float32Array([0.9, 0.8]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 800, originalWidth: 800, inputSize: 800 },
      0.3,
      0.5,
    )

    // NMS should remove the lower-scored overlapping box
    expect(result).toHaveLength(1)
    expect(result[0].score).toBeCloseTo(0.9)
  })

  it('expands bounding boxes by 2% vertically', () => {
    const outputs = {
      labels: new Float32Array([2]),
      boxes: new Float32Array([100, 100, 500, 200]), // height = 100
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 800, originalWidth: 800, inputSize: 800 },
      0.3,
    )

    // Box height is 100, 2% expansion = 2px each side
    expect(result[0].bbox.y1).toBeLessThan(100)
    expect(result[0].bbox.y2).toBeGreaterThan(200)
  })

  it('filters out boxes smaller than 10px', () => {
    const outputs = {
      labels: new Float32Array([2]),
      boxes: new Float32Array([100, 100, 105, 105]), // 5x5 box
      scores: new Float32Array([0.9]),
    }

    const result = deimPostprocess(
      outputs,
      { originalHeight: 800, originalWidth: 800, inputSize: 800 },
      0.3,
    )

    expect(result).toHaveLength(0)
  })
})
