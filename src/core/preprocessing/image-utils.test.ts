import { describe, it, expect } from 'vitest'
import {
  transposeHWCtoCHW,
  padToSquare,
  normalizeImageNet,
  normalizeMinusOneToOne,
  reverseChannels,
  cropRegion,
} from './image-utils.ts'

/** Helper: create a minimal RGBA pixel buffer */
function makeRgba(pixels: Array<[number, number, number, number]>): Uint8ClampedArray {
  const data = new Uint8ClampedArray(pixels.length * 4)
  pixels.forEach(([r, g, b, a], i) => {
    data[i * 4] = r
    data[i * 4 + 1] = g
    data[i * 4 + 2] = b
    data[i * 4 + 3] = a
  })
  return data
}

describe('transposeHWCtoCHW', () => {
  it('transposes a 2x2 RGB image from HWC to CHW', () => {
    // 2x2 image, 3 channels (RGB values as floats)
    const hwc = new Float32Array([
      // row 0
      0.1, 0.2, 0.3,  // pixel (0,0)
      0.4, 0.5, 0.6,  // pixel (0,1)
      // row 1
      0.7, 0.8, 0.9,  // pixel (1,0)
      1.0, 1.1, 1.2,  // pixel (1,1)
    ])

    const chw = transposeHWCtoCHW(hwc, 2, 2, 3)

    // Channel 0 (R): [0.1, 0.4, 0.7, 1.0]
    expect(chw[0]).toBeCloseTo(0.1)
    expect(chw[1]).toBeCloseTo(0.4)
    expect(chw[2]).toBeCloseTo(0.7)
    expect(chw[3]).toBeCloseTo(1.0)

    // Channel 1 (G): [0.2, 0.5, 0.8, 1.1]
    expect(chw[4]).toBeCloseTo(0.2)
    expect(chw[5]).toBeCloseTo(0.5)
    expect(chw[6]).toBeCloseTo(0.8)
    expect(chw[7]).toBeCloseTo(1.1)

    // Channel 2 (B): [0.3, 0.6, 0.9, 1.2]
    expect(chw[8]).toBeCloseTo(0.3)
    expect(chw[9]).toBeCloseTo(0.6)
    expect(chw[10]).toBeCloseTo(0.9)
    expect(chw[11]).toBeCloseTo(1.2)
  })

  it('returns correct length', () => {
    const hwc = new Float32Array(3 * 4 * 3) // 3x4x3
    const chw = transposeHWCtoCHW(hwc, 3, 4, 3)
    expect(chw).toHaveLength(3 * 4 * 3)
  })
})

describe('padToSquare', () => {
  it('pads a 2x3 image to 3x3 (height < width)', () => {
    // 2 rows, 3 cols
    const data = makeRgba([
      [10, 20, 30, 255], [40, 50, 60, 255], [70, 80, 90, 255],
      [100, 110, 120, 255], [130, 140, 150, 255], [160, 170, 180, 255],
    ])
    const result = padToSquare(data, 2, 3)
    expect(result.width).toBe(3)
    expect(result.height).toBe(3)
    expect(result.data.length).toBe(3 * 3 * 4)

    // First two rows should be original data
    expect(result.data[0]).toBe(10) // pixel (0,0) R
    // Third row should be zero-padded
    expect(result.data[3 * 3 * 4 - 4]).toBe(0) // last pixel R
  })

  it('pads a 3x2 image to 3x3 (width < height)', () => {
    const data = makeRgba([
      [10, 20, 30, 255], [40, 50, 60, 255],
      [70, 80, 90, 255], [100, 110, 120, 255],
      [130, 140, 150, 255], [160, 170, 180, 255],
    ])
    const result = padToSquare(data, 3, 2)
    expect(result.width).toBe(3)
    expect(result.height).toBe(3)
  })

  it('does not change a square image', () => {
    const data = makeRgba([
      [10, 20, 30, 255], [40, 50, 60, 255],
      [70, 80, 90, 255], [100, 110, 120, 255],
    ])
    const result = padToSquare(data, 2, 2)
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.data).toEqual(data)
  })
})

describe('normalizeImageNet', () => {
  it('normalizes pixel values with ImageNet mean/std', () => {
    // Single pixel: R=124, G=116, B=104 (close to ImageNet mean * 255)
    const data = makeRgba([[124, 116, 104, 255]])
    const result = normalizeImageNet(data, 1, 1)

    // (124/255 - 0.485) / 0.229 ≈ 0.0001 (close to 0)
    // (116/255 - 0.456) / 0.224 ≈ -0.0037
    // (104/255 - 0.406) / 0.225 ≈ 0.0069
    expect(result).toHaveLength(3)
    expect(Math.abs(result[0])).toBeLessThan(0.05) // R channel close to 0
    expect(Math.abs(result[1])).toBeLessThan(0.05) // G channel close to 0
    expect(Math.abs(result[2])).toBeLessThan(0.05) // B channel close to 0
  })

  it('produces correct shape for 2x2 image', () => {
    const data = makeRgba([
      [100, 100, 100, 255], [200, 200, 200, 255],
      [50, 50, 50, 255], [150, 150, 150, 255],
    ])
    const result = normalizeImageNet(data, 2, 2)
    expect(result).toHaveLength(2 * 2 * 3) // HWC format
  })
})

describe('normalizeMinusOneToOne', () => {
  it('normalizes pixel values to [-1, 1] range', () => {
    const data = makeRgba([[0, 128, 255, 255]])
    const result = normalizeMinusOneToOne(data, 1, 1)

    // 0/255 * 2 - 1 = -1.0
    expect(result[0]).toBeCloseTo(-1.0)
    // 128/255 * 2 - 1 ≈ 0.00392
    expect(result[1]).toBeCloseTo(128 / 255 * 2 - 1)
    // 255/255 * 2 - 1 = 1.0
    expect(result[2]).toBeCloseTo(1.0)
  })
})

describe('reverseChannels', () => {
  it('reverses RGB to BGR in HWC format', () => {
    // 2 pixels in HWC
    const hwc = new Float32Array([
      0.1, 0.2, 0.3, // pixel 0: R=0.1, G=0.2, B=0.3
      0.4, 0.5, 0.6, // pixel 1
    ])
    const bgr = reverseChannels(hwc, 2, 3)

    // pixel 0: B=0.3, G=0.2, R=0.1
    expect(bgr[0]).toBeCloseTo(0.3)
    expect(bgr[1]).toBeCloseTo(0.2)
    expect(bgr[2]).toBeCloseTo(0.1)
    // pixel 1: B=0.6, G=0.5, R=0.4
    expect(bgr[3]).toBeCloseTo(0.6)
    expect(bgr[4]).toBeCloseTo(0.5)
    expect(bgr[5]).toBeCloseTo(0.4)
  })
})

describe('cropRegion', () => {
  it('crops a subregion from RGBA data', () => {
    // 4x4 image, crop the 2x2 region at (1,1)
    const pixels: Array<[number, number, number, number]> = []
    for (let i = 0; i < 16; i++) {
      pixels.push([i * 10, i * 10 + 1, i * 10 + 2, 255])
    }
    const data = makeRgba(pixels)

    const result = cropRegion(data, 4, 4, 1, 1, 3, 3) // x1=1, y1=1, x2=3, y2=3
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
    expect(result.data.length).toBe(2 * 2 * 4)

    // Top-left of crop = pixel (1,1) in original = index 5
    expect(result.data[0]).toBe(50)  // R of pixel 5
    expect(result.data[1]).toBe(51)  // G of pixel 5
  })

  it('clamps coordinates to image bounds', () => {
    const data = makeRgba([
      [10, 20, 30, 255], [40, 50, 60, 255],
      [70, 80, 90, 255], [100, 110, 120, 255],
    ])
    // Request crop beyond bounds
    const result = cropRegion(data, 2, 2, -1, -1, 5, 5)
    expect(result.width).toBe(2)
    expect(result.height).toBe(2)
  })
})
