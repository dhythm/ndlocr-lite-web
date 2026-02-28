import type { TextBlock, TextRegion } from './ocr'

export type WorkerInMessage =
  | { type: 'INITIALIZE' }
  | { type: 'OCR_PROCESS'; id: string; imageData: ImageData; startTime: number }
  | { type: 'LAYOUT_DETECT'; id: string; imageData: ImageData; startTime: number }
  | { type: 'TERMINATE' }

export type WorkerOutMessage =
  | {
      type: 'OCR_PROGRESS'
      id?: string
      stage: string
      progress: number
      message: string
      modelProgress?: Record<string, number>
    }
  | {
      type: 'OCR_COMPLETE'
      id: string
      textBlocks: TextBlock[]
      txt: string
      processingTime: number
    }
  | {
      type: 'OCR_ERROR'
      id?: string
      error: string
      stage?: string
    }
  | {
      type: 'LAYOUT_DONE'
      id: string
      textRegions: TextRegion[]
      croppedImages: ImageData[]
      startTime: number
    }
