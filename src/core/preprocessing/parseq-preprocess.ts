import type { ParseqModelSize } from '../pipeline/types.ts'
import { normalizeMinusOneToOne, transposeHWCtoCHW } from './image-utils.ts'
import { resizeBilinear, rotate90CounterClockwise } from './resize.ts'

export const PARSEQ_HEIGHTS = {
  small: 16,
  medium: 16,
  large: 16,
} as const

const PARSEQ_WIDTHS: Record<ParseqModelSize, number> = {
  small: 256,
  medium: 384,
  large: 768,
}

/**
 * Select the PARSeq model size based on predicted character count.
 *
 * - predCharCount === 3 → small (256-width, ≤30 chars)
 * - predCharCount === 2 → medium (384-width, ≤50 chars)
 * - otherwise → large (768-width, ≤100 chars)
 */
export function selectParseqModelSize(predCharCount: number | undefined): ParseqModelSize {
  if (predCharCount === 3) return 'small'
  if (predCharCount === 2) return 'medium'
  return 'large'
}

/**
 * Preprocess a line image for PARSeq text recognition model.
 *
 * Pipeline:
 * 1. If portrait (h > w), rotate 90° counter-clockwise
 * 2. Resize to model input size (e.g., 768×16)
 * 3. Normalize to [-1, 1]: pixel/255 * 2.0 - 1.0
 * 4. HWC → CHW transpose
 * 5. Returns Float32Array [1, 3, 16, W]
 */
export function preprocessForParseq(
  data: Uint8ClampedArray,
  height: number,
  width: number,
  modelSize: ParseqModelSize,
): { tensor: Float32Array; modelWidth: number } {
  let currentData = data
  let currentWidth = width
  let currentHeight = height

  // 1. Rotate if portrait (counter-clockwise for vertical text)
  if (currentHeight > currentWidth) {
    const rotated = rotate90CounterClockwise(currentData, currentWidth, currentHeight)
    currentData = rotated.data
    currentWidth = rotated.width
    currentHeight = rotated.height
  }

  const modelHeight = PARSEQ_HEIGHTS[modelSize]
  const modelWidth = PARSEQ_WIDTHS[modelSize]

  // 2. Resize to model input size
  const resized = resizeBilinear(currentData, currentWidth, currentHeight, modelWidth, modelHeight)

  // 3. Normalize to [-1, 1] (returns HWC Float32Array, RGB)
  const normalized = normalizeMinusOneToOne(resized.data, modelHeight, modelWidth)

  // 4. HWC → CHW transpose (RGB channels directly, no BGR reversal)
  const chw = transposeHWCtoCHW(normalized, modelHeight, modelWidth, 3)

  return { tensor: chw, modelWidth }
}
