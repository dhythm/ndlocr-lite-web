import * as pdfjsLib from 'pdfjs-dist'

// Configure worker for pdfjs
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString()

export type PdfPage = {
  data: Uint8ClampedArray
  width: number
  height: number
  pageNumber: number
}

/**
 * Render all pages of a PDF file to ImageData.
 *
 * @param pdfData - PDF file as ArrayBuffer
 * @param scale - Render scale (default 2.0 for good OCR quality)
 * @returns Array of rendered pages
 */
export async function renderPdfPages(
  pdfData: ArrayBuffer,
  scale: number = 2.0,
  onProgress?: (page: number, total: number) => void,
): Promise<PdfPage[]> {
  const doc = await pdfjsLib.getDocument({ data: pdfData }).promise
  const pages: PdfPage[] = []

  for (let i = 1; i <= doc.numPages; i++) {
    onProgress?.(i, doc.numPages)

    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale })

    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get 2D context')

    // pdfjs-dist v5 requires `canvas` in RenderParameters
    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise

    const imageData = ctx.getImageData(0, 0, viewport.width, viewport.height)

    pages.push({
      data: imageData.data,
      width: viewport.width,
      height: viewport.height,
      pageNumber: i,
    })
  }

  return pages
}
