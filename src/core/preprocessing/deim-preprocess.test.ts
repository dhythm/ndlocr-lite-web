import { describe, it, expect } from 'vitest'
import { preprocessForDeim, DEIM_INPUT_SIZE } from './deim-preprocess.ts'

function makeRgba(width: number, height: number, fill: [number, number, number] = [128, 128, 128]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0]
    data[i * 4 + 1] = fill[1]
    data[i * 4 + 2] = fill[2]
    data[i * 4 + 3] = 255
  }
  return data
}

describe('DEIM_INPUT_SIZE', () => {
  it('is 800', () => {
    expect(DEIM_INPUT_SIZE).toBe(800)
  })
})

describe('preprocessForDeim', () => {
  it('produces tensor with correct shape [1,3,800,800]', () => {
    const data = makeRgba(100, 80)
    const result = preprocessForDeim(data, 80, 100)

    expect(result.imageTensor).toHaveLength(1 * 3 * 800 * 800)
  })

  it('produces imShape with model input dimensions', () => {
    const data = makeRgba(200, 150)
    const result = preprocessForDeim(data, 150, 200)

    expect(result.imShape).toHaveLength(2)
    expect(result.imShape[0]).toBe(BigInt(800)) // inputSize
    expect(result.imShape[1]).toBe(BigInt(800)) // inputSize
  })

  it('preserves original dimensions', () => {
    const data = makeRgba(200, 150)
    const result = preprocessForDeim(data, 150, 200)

    expect(result.originalHeight).toBe(150)
    expect(result.originalWidth).toBe(200)
  })

  it('tensor values are ImageNet normalized', () => {
    // Fill with ImageNet mean * 255 values
    const data = makeRgba(10, 10, [124, 116, 104])
    const result = preprocessForDeim(data, 10, 10)

    // After ImageNet normalization, these values should be close to 0
    const val = result.imageTensor[0]
    expect(Math.abs(val)).toBeLessThan(0.1)
  })

  it('stores input dimensions', () => {
    const data = makeRgba(200, 150)
    const result = preprocessForDeim(data, 150, 200)

    expect(result.inputHeight).toBe(800)
    expect(result.inputWidth).toBe(800)
  })
})
