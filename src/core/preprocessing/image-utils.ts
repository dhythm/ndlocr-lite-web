/**
 * Transpose image data from HWC (Height, Width, Channels) to CHW (Channels, Height, Width)
 */
export function transposeHWCtoCHW(
  hwc: Float32Array,
  height: number,
  width: number,
  channels: number,
): Float32Array {
  const chw = new Float32Array(channels * height * width)
  for (let c = 0; c < channels; c++) {
    for (let h = 0; h < height; h++) {
      for (let w = 0; w < width; w++) {
        chw[c * height * width + h * width + w] = hwc[h * width * channels + w * channels + c]
      }
    }
  }
  return chw
}

/**
 * Pad an RGBA image to square by adding zero-filled rows or columns
 */
export function padToSquare(
  data: Uint8ClampedArray,
  height: number,
  width: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const maxDim = Math.max(height, width)
  if (height === maxDim && width === maxDim) {
    return { data, width, height }
  }

  const padded = new Uint8ClampedArray(maxDim * maxDim * 4)
  for (let y = 0; y < height; y++) {
    const srcOffset = y * width * 4
    const dstOffset = y * maxDim * 4
    padded.set(data.subarray(srcOffset, srcOffset + width * 4), dstOffset)
  }

  return { data: padded, width: maxDim, height: maxDim }
}

/**
 * Normalize RGBA pixel data using ImageNet mean/std values
 * Returns Float32Array in HWC format (RGB only, alpha dropped)
 *
 * Formula: (pixel/255 - mean) / std
 * Mean: [0.485, 0.456, 0.406]
 * Std:  [0.229, 0.224, 0.225]
 */
export function normalizeImageNet(
  data: Uint8ClampedArray,
  height: number,
  width: number,
): Float32Array {
  const mean = [0.485, 0.456, 0.406]
  const std = [0.229, 0.224, 0.225]
  const result = new Float32Array(height * width * 3)

  for (let i = 0; i < height * width; i++) {
    for (let c = 0; c < 3; c++) {
      result[i * 3 + c] = (data[i * 4 + c] / 255 - mean[c]) / std[c]
    }
  }

  return result
}

/**
 * Normalize RGBA pixel data to [-1, 1] range
 * Returns Float32Array in HWC format (RGB only, alpha dropped)
 *
 * Formula: pixel/255 * 2.0 - 1.0
 */
export function normalizeMinusOneToOne(
  data: Uint8ClampedArray,
  height: number,
  width: number,
): Float32Array {
  const result = new Float32Array(height * width * 3)

  for (let i = 0; i < height * width; i++) {
    for (let c = 0; c < 3; c++) {
      result[i * 3 + c] = data[i * 4 + c] / 255 * 2.0 - 1.0
    }
  }

  return result
}

/**
 * Reverse channel order in HWC format (e.g., RGB → BGR)
 */
export function reverseChannels(
  hwc: Float32Array,
  numPixels: number,
  channels: number,
): Float32Array {
  const result = new Float32Array(hwc.length)

  for (let i = 0; i < numPixels; i++) {
    for (let c = 0; c < channels; c++) {
      result[i * channels + c] = hwc[i * channels + (channels - 1 - c)]
    }
  }

  return result
}

/**
 * Crop a rectangular region from RGBA image data
 * Coordinates are clamped to image bounds
 */
export function cropRegion(
  data: Uint8ClampedArray,
  imgWidth: number,
  imgHeight: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const clampedX1 = Math.max(0, Math.min(Math.floor(x1), imgWidth))
  const clampedY1 = Math.max(0, Math.min(Math.floor(y1), imgHeight))
  const clampedX2 = Math.max(0, Math.min(Math.ceil(x2), imgWidth))
  const clampedY2 = Math.max(0, Math.min(Math.ceil(y2), imgHeight))

  const cropW = clampedX2 - clampedX1
  const cropH = clampedY2 - clampedY1

  if (cropW <= 0 || cropH <= 0) {
    return { data: new Uint8ClampedArray(0), width: 0, height: 0 }
  }

  const result = new Uint8ClampedArray(cropW * cropH * 4)

  for (let y = 0; y < cropH; y++) {
    const srcOffset = ((clampedY1 + y) * imgWidth + clampedX1) * 4
    const dstOffset = y * cropW * 4
    result.set(data.subarray(srcOffset, srcOffset + cropW * 4), dstOffset)
  }

  return { data: result, width: cropW, height: cropH }
}
