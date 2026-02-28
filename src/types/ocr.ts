export type TextRegion = {
  x: number
  y: number
  width: number
  height: number
  confidence: number
  classId: number
  charCountCategory?: number
}

export type TextBlock = TextRegion & {
  text: string
  readingOrder: number
}

export type OCRResult = {
  id: string
  fileName: string
  imageDataUrl: string
  textBlocks: TextBlock[]
  fullText: string
  processingTimeMs: number
  createdAt: number
}

export type ProcessedImage = {
  fileName: string
  pageIndex?: number
  imageData: ImageData
  thumbnailDataUrl: string
}

export type OCRJobState = {
  status: 'idle' | 'loading_model' | 'processing' | 'done' | 'error'
  currentFile: string
  currentFileIndex: number
  totalFiles: number
  stageProgress: number
  stage: string
  message: string
  errorMessage?: string
  modelProgress?: Record<string, number>
}
