export type DBRunFile = {
  fileName: string
  imageDataUrl: string
  textBlocks: Array<{
    x: number
    y: number
    width: number
    height: number
    text: string
    readingOrder: number
    confidence: number
  }>
  fullText: string
  processingTimeMs: number
}

export type DBRunEntry = {
  id: string
  files: DBRunFile[]
  createdAt: number
}
