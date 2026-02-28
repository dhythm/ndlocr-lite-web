import * as pdfjsLib from 'pdfjs-dist'
import type { ProcessedImage } from '../types/ocr'
import { makeThumbnailDataUrl } from './imageLoader'

// Use the worker from pdfjs-dist
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export async function pdfToProcessedImages(
  file: File,
  scale = 2.0,
  onProgress?: (currentPage: number, totalPages: number) => void,
): Promise<ProcessedImage[]> {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const images: ProcessedImage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    if (onProgress) onProgress(i, pdf.numPages)

    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height))
    const ctx = canvas.getContext('2d')!

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const thumbnailDataUrl = makeThumbnailDataUrl(canvas, canvas.width, canvas.height)

    images.push({
      fileName: file.name,
      pageIndex: i,
      imageData,
      thumbnailDataUrl,
    })
  }

  return images
}
