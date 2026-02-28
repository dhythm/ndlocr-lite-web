/**
 * NDL OCR category labels (0-indexed, 17 classes)
 */
export type CategoryName =
  | 'body'
  | 'column'
  | 'caption'
  | 'footnote'
  | 'header'
  | 'footer'
  | 'title'
  | 'page_number'
  | 'figure'
  | 'table'
  | 'equation'
  | 'heading'
  | 'list'
  | 'abstract'
  | 'advertisement'
  | 'separator'
  | 'other'

/**
 * Bounding box in [x1, y1, x2, y2] format (pixel coordinates)
 */
export type BoundingBox = {
  readonly x1: number
  readonly y1: number
  readonly x2: number
  readonly y2: number
}

/**
 * A single detection result from DEIM layout detection
 */
export type DetectionResult = {
  readonly bbox: BoundingBox
  readonly category: CategoryName
  readonly categoryIndex: number
  readonly score: number
  readonly predCharCount?: number
}

/**
 * A single text line recognition result from PARSeq
 */
export type RecognitionResult = {
  readonly text: string
  readonly bbox: BoundingBox
  readonly confidence: number
}

/**
 * A text region (block) containing multiple lines
 */
export type TextRegion = {
  readonly bbox: BoundingBox
  readonly category: CategoryName
  readonly lines: ReadonlyArray<RecognitionResult>
  readonly readingOrder: number
}

/**
 * Complete OCR result for a single page/image
 */
export type OcrPageResult = {
  readonly width: number
  readonly height: number
  readonly regions: ReadonlyArray<TextRegion>
  readonly detections: ReadonlyArray<DetectionResult>
}

/**
 * Complete OCR result (possibly multi-page for PDFs)
 */
export type OcrResult = {
  readonly pages: ReadonlyArray<OcrPageResult>
}

/**
 * Pipeline configuration
 */
export type PipelineConfig = {
  readonly detConfThreshold: number
  readonly detScoreThreshold: number
  readonly detIouThreshold: number
  readonly deimModelUrl: string
  readonly parseqModelUrls: {
    readonly small: string  // 256-width, ≤30 chars
    readonly medium: string // 384-width, ≤50 chars
    readonly large: string  // 768-width, ≤100 chars
  }
}

/**
 * Progress callback for tracking pipeline execution
 */
export type ProgressStage =
  | 'loading-model'
  | 'detecting-layout'
  | 'recognizing-text'
  | 'ordering-text'
  | 'complete'

export type ProgressInfo = {
  readonly stage: ProgressStage
  readonly progress: number // 0-1
  readonly message: string
  readonly detail?: string
}

export type ProgressCallback = (info: ProgressInfo) => void

/**
 * DEIM model input
 */
export type DeimInput = {
  readonly imageTensor: Float32Array
  readonly imShape: BigInt64Array
  readonly inputHeight: number
  readonly inputWidth: number
  readonly originalHeight: number
  readonly originalWidth: number
}

/**
 * PARSeq model size selection
 */
export type ParseqModelSize = 'small' | 'medium' | 'large'

/**
 * Default pipeline configuration
 */
export const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  detConfThreshold: 0.3,
  detScoreThreshold: 0.2,
  detIouThreshold: 0.5,
  deimModelUrl: '/models/deim-s-1024x1024.onnx',
  parseqModelUrls: {
    small: '/models/parseq-ndl-16x256-30-tiny-192epoch-tegaki3.onnx',
    medium: '/models/parseq-ndl-16x384-50-tiny-146epoch-tegaki2.onnx',
    large: '/models/parseq-ndl-16x768-100-tiny-165epoch-tegaki2.onnx',
  },
}
