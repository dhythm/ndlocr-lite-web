import type { DetectionResult } from '../pipeline/types.ts'
import { CATEGORY_NAMES } from '../config/categories.ts'

type DeimOutputs = {
  readonly labels: Float32Array
  readonly boxes: Float32Array
  readonly scores: Float32Array
  readonly charCounts?: Float32Array
}

type PostprocessMetadata = {
  readonly originalHeight: number
  readonly originalWidth: number
  readonly inputSize: number
}

/**
 * Post-process DEIM layout detection outputs.
 *
 * - Filters by confidence threshold
 * - Scales boxes from input pixel space [0, inputSize] to original image space
 * - Applies NMS (Non-Maximum Suppression)
 * - Expands bounding boxes by 2% vertically
 * - Converts 1-indexed labels to 0-indexed category indices
 */
export function deimPostprocess(
  outputs: DeimOutputs,
  metadata: PostprocessMetadata,
  confThreshold: number,
  iouThreshold: number = 0.5,
): DetectionResult[] {
  const { labels, boxes, scores, charCounts } = outputs
  const numDetections = labels.length
  const results: DetectionResult[] = []

  // Boxes are in input pixel space [0, inputSize].
  // Scale to original image space: maxWH / inputSize
  const maxWH = Math.max(metadata.originalHeight, metadata.originalWidth)
  const scaleX = maxWH / metadata.inputSize
  const scaleY = maxWH / metadata.inputSize

  for (let i = 0; i < numDetections; i++) {
    if (scores[i] < confThreshold) continue

    const categoryIndex = Math.round(labels[i]) - 1

    let x1 = boxes[i * 4 + 0] * scaleX
    let y1 = boxes[i * 4 + 1] * scaleY
    let x2 = boxes[i * 4 + 2] * scaleX
    let y2 = boxes[i * 4 + 3] * scaleY

    // Expand bounding box by 2% vertically
    const boxHeight = y2 - y1
    const deltaH = boxHeight * 0.02
    y1 = y1 - deltaH
    y2 = y2 + deltaH

    // Clamp to image bounds
    x1 = Math.max(0, Math.round(x1))
    y1 = Math.max(0, Math.round(y1))
    x2 = Math.min(metadata.originalWidth, Math.round(x2))
    y2 = Math.min(metadata.originalHeight, Math.round(y2))

    // Minimum size check
    if ((x2 - x1) < 10 || (y2 - y1) < 10) continue

    const category = CATEGORY_NAMES[categoryIndex] ?? 'other'

    results.push({
      bbox: { x1, y1, x2, y2 },
      category,
      categoryIndex,
      score: scores[i],
      predCharCount: charCounts ? charCounts[i] : undefined,
    })
  }

  return nms(results, iouThreshold)
}

function nms(detections: DetectionResult[], iouThreshold: number): DetectionResult[] {
  const sorted = [...detections].sort((a, b) => b.score - a.score)
  const keep: DetectionResult[] = []

  for (const d of sorted) {
    if (keep.every(k => iou(k.bbox, d.bbox) < iouThreshold)) {
      keep.push(d)
    }
  }

  return keep
}

function iou(
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number },
): number {
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1))
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1))
  const inter = ix * iy
  if (inter === 0) return 0
  const areaA = (a.x2 - a.x1) * (a.y2 - a.y1)
  const areaB = (b.x2 - b.x1) * (b.y2 - b.y1)
  return inter / (areaA + areaB - inter)
}
