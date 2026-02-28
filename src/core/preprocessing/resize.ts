/**
 * Bilinear interpolation resize for RGBA images.
 * Works in pure JS without Canvas (for Web Worker / test environments).
 */
export function resizeBilinear(
  data: Uint8ClampedArray,
  srcWidth: number,
  srcHeight: number,
  dstWidth: number,
  dstHeight: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  if (srcWidth === dstWidth && srcHeight === dstHeight) {
    return { data, width: srcWidth, height: srcHeight }
  }

  const result = new Uint8ClampedArray(dstWidth * dstHeight * 4)

  const xRatio = srcWidth / dstWidth
  const yRatio = srcHeight / dstHeight

  for (let y = 0; y < dstHeight; y++) {
    const srcY = y * yRatio
    const y0 = Math.floor(srcY)
    const y1 = Math.min(y0 + 1, srcHeight - 1)
    const yFrac = srcY - y0

    for (let x = 0; x < dstWidth; x++) {
      const srcX = x * xRatio
      const x0 = Math.floor(srcX)
      const x1 = Math.min(x0 + 1, srcWidth - 1)
      const xFrac = srcX - x0

      const dstIdx = (y * dstWidth + x) * 4

      for (let c = 0; c < 4; c++) {
        const topLeft = data[(y0 * srcWidth + x0) * 4 + c]
        const topRight = data[(y0 * srcWidth + x1) * 4 + c]
        const bottomLeft = data[(y1 * srcWidth + x0) * 4 + c]
        const bottomRight = data[(y1 * srcWidth + x1) * 4 + c]

        const top = topLeft + (topRight - topLeft) * xFrac
        const bottom = bottomLeft + (bottomRight - bottomLeft) * xFrac
        result[dstIdx + c] = Math.round(top + (bottom - top) * yFrac)
      }
    }
  }

  return { data: result, width: dstWidth, height: dstHeight }
}

/**
 * Rotate an RGBA image 90 degrees clockwise
 */
export function rotate90Clockwise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const newWidth = height
  const newHeight = width
  const result = new Uint8ClampedArray(newWidth * newHeight * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstX = height - 1 - y
      const dstY = x
      const dstIdx = (dstY * newWidth + dstX) * 4
      result[dstIdx] = data[srcIdx]
      result[dstIdx + 1] = data[srcIdx + 1]
      result[dstIdx + 2] = data[srcIdx + 2]
      result[dstIdx + 3] = data[srcIdx + 3]
    }
  }

  return { data: result, width: newWidth, height: newHeight }
}

/**
 * Rotate an RGBA image 90 degrees counter-clockwise
 */
export function rotate90CounterClockwise(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): { data: Uint8ClampedArray; width: number; height: number } {
  const newWidth = height
  const newHeight = width
  const result = new Uint8ClampedArray(newWidth * newHeight * 4)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y * width + x) * 4
      const dstX = y
      const dstY = width - 1 - x
      const dstIdx = (dstY * newWidth + dstX) * 4
      result[dstIdx] = data[srcIdx]
      result[dstIdx + 1] = data[srcIdx + 1]
      result[dstIdx + 2] = data[srcIdx + 2]
      result[dstIdx + 3] = data[srcIdx + 3]
    }
  }

  return { data: result, width: newWidth, height: newHeight }
}
