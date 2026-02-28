import type { ProcessedImage } from '../types/ocr'

export async function fileToProcessedImage(file: File): Promise<ProcessedImage> {
  const bitmap = await createImageBitmap(file)
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0)
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height)
  bitmap.close()

  const thumbnailDataUrl = makeThumbnailDataUrl(canvas, bitmap.width, bitmap.height)

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

export function makeThumbnailDataUrl(
  source: OffscreenCanvas | HTMLCanvasElement,
  width: number,
  height: number,
  maxWidth = 200,
): string {
  const scale = Math.min(1, maxWidth / width)
  const thumbW = Math.round(width * scale)
  const thumbH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = thumbW
  canvas.height = thumbH
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source as unknown as CanvasImageSource, 0, 0, thumbW, thumbH)
  return canvas.toDataURL('image/jpeg', 0.7)
}
