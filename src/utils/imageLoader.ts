import type { ProcessedImage } from '../types/ocr'

export async function fileToProcessedImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file)
  const width = bitmap.width
  const height = bitmap.height
  const canvas = new OffscreenCanvas(width, height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, width, height)
  bitmap.close()

  const thumbnailDataUrl = makeThumbnailFromImageData(imageData, width, height, 1200)

  return {
    fileName: file.name,
    imageData,
    thumbnailDataUrl,
  }
}

export function imageDataToDataUrl(imageData: ImageData): string {
  const canvas = document.createElement('canvas')
  canvas.width = imageData.width
  canvas.height = imageData.height
  const ctx = canvas.getContext('2d')!
  ctx.putImageData(imageData, 0, 0)
  return canvas.toDataURL('image/jpeg', 0.85)
}

export function makeThumbnailFromImageData(
  imageData: ImageData,
  width: number,
  height: number,
  maxWidth = 200,
): string {
  const scale = Math.min(1, maxWidth / width)
  const thumbW = Math.round(width * scale)
  const thumbH = Math.round(height * scale)

  // Use HTMLCanvasElement for data URL generation (compatible with all contexts)
  const sourceCanvas = document.createElement('canvas')
  sourceCanvas.width = width
  sourceCanvas.height = height
  const sourceCtx = sourceCanvas.getContext('2d')!
  sourceCtx.putImageData(imageData, 0, 0)

  const thumbCanvas = document.createElement('canvas')
  thumbCanvas.width = thumbW
  thumbCanvas.height = thumbH
  const thumbCtx = thumbCanvas.getContext('2d')!
  thumbCtx.drawImage(sourceCanvas, 0, 0, thumbW, thumbH)
  return thumbCanvas.toDataURL('image/jpeg', 0.7)
}
