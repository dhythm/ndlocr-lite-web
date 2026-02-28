import type { DeimInput } from '../pipeline/types.ts'
import { padToSquare, normalizeImageNet, transposeHWCtoCHW } from './image-utils.ts'
import { resizeBilinear } from './resize.ts'

export const DEIM_INPUT_SIZE = 800

/**
 * Preprocess an image for DEIM layout detection model.
 *
 * Pipeline:
 * 1. Pad to square (max(h,w) × max(h,w))
 * 2. Resize to 1024×1024
 * 3. ImageNet normalize: (pixel/255 - mean) / std
 * 4. HWC → CHW transpose
 * 5. Add batch dimension → Float32Array [1,3,1024,1024]
 */
export function preprocessForDeim(
  data: Uint8ClampedArray,
  height: number,
  width: number,
): DeimInput {
  // 1. Pad to square
  const padded = padToSquare(data, height, width)

  // 2. Resize to DEIM input size
  const resized = resizeBilinear(padded.data, padded.width, padded.height, DEIM_INPUT_SIZE, DEIM_INPUT_SIZE)

  // 3. ImageNet normalization (returns HWC Float32Array, RGB only)
  const normalized = normalizeImageNet(resized.data, DEIM_INPUT_SIZE, DEIM_INPUT_SIZE)

  // 4. HWC → CHW transpose
  const chw = transposeHWCtoCHW(normalized, DEIM_INPUT_SIZE, DEIM_INPUT_SIZE, 3)

  // 5. im_shape for DEIM model (model input size, not original image size)
  const imShape = new BigInt64Array([BigInt(DEIM_INPUT_SIZE), BigInt(DEIM_INPUT_SIZE)])

  return {
    imageTensor: chw,
    imShape,
    inputHeight: DEIM_INPUT_SIZE,
    inputWidth: DEIM_INPUT_SIZE,
    originalHeight: height,
    originalWidth: width,
  }
}
