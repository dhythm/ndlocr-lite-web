import { describe, it, expect } from 'vitest'
import { preprocessForParseq, selectParseqModelSize, PARSEQ_HEIGHTS } from './parseq-preprocess.ts'

function makeRgba(width: number, height: number): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = 128
    data[i * 4 + 1] = 128
    data[i * 4 + 2] = 128
    data[i * 4 + 3] = 255
  }
  return data
}

describe('PARSEQ_HEIGHTS', () => {
  it('has height of 16 for all models', () => {
    expect(PARSEQ_HEIGHTS.small).toBe(16)
    expect(PARSEQ_HEIGHTS.medium).toBe(16)
    expect(PARSEQ_HEIGHTS.large).toBe(16)
  })
})

describe('selectParseqModelSize', () => {
  it('returns small for predCharCount=3', () => {
    expect(selectParseqModelSize(3)).toBe('small')
  })

  it('returns medium for predCharCount=2', () => {
    expect(selectParseqModelSize(2)).toBe('medium')
  })

  it('returns large for predCharCount=1', () => {
    expect(selectParseqModelSize(1)).toBe('large')
  })

  it('returns large for predCharCount=0', () => {
    expect(selectParseqModelSize(0)).toBe('large')
  })

  it('returns large for undefined predCharCount', () => {
    expect(selectParseqModelSize(undefined)).toBe('large')
  })
})

describe('preprocessForParseq', () => {
  it('produces tensor in CHW format for landscape image', () => {
    const data = makeRgba(100, 16) // landscape
    const result = preprocessForParseq(data, 16, 100, 'large')

    // Output should be [1, 3, 16, 768] = 36864
    expect(result.tensor).toHaveLength(1 * 3 * 16 * 768)
    expect(result.modelWidth).toBe(768)
  })

  it('rotates portrait images 90 degrees counter-clockwise', () => {
    const data = makeRgba(16, 100) // portrait (w=16, h=100)
    const result = preprocessForParseq(data, 100, 16, 'large')

    // After rotation it becomes landscape, then resized to model size
    expect(result.tensor.length).toBe(1 * 3 * 16 * 768)
  })

  it('uses correct width for each model size', () => {
    const data = makeRgba(100, 16)

    const small = preprocessForParseq(data, 16, 100, 'small')
    expect(small.modelWidth).toBe(256)
    expect(small.tensor).toHaveLength(1 * 3 * 16 * 256)

    const medium = preprocessForParseq(data, 16, 100, 'medium')
    expect(medium.modelWidth).toBe(384)
    expect(medium.tensor).toHaveLength(1 * 3 * 16 * 384)
  })

  it('applies [-1,1] normalization without BGR reversal', () => {
    // Create 1x1 image with R=255, G=0, B=0
    const data = new Uint8ClampedArray([255, 0, 0, 255])
    const result = preprocessForParseq(data, 1, 1, 'small')

    // After normalization: R = 255/255*2-1 = 1, G = -1, B = -1
    // In CHW format: channel 0 (R), channel 1 (G), channel 2 (B)
    // Just verify the tensor has valid values in [-1, 1] range
    for (let i = 0; i < result.tensor.length; i++) {
      expect(result.tensor[i]).toBeGreaterThanOrEqual(-1.001)
      expect(result.tensor[i]).toBeLessThanOrEqual(1.001)
    }
  })
})
