import type { DetectionResult } from '../pipeline/types.ts'
import { CATEGORY_NAMES } from '../config/categories.ts'

type DeimOutputs = {
  readonly labels: Float32Array
  readonly boxes: Float32Array
  readonly scores: Float32Array
  readonly charCounts?: Float32Array
}

type OrigSize = {
  readonly height: number
  readonly width: number
}

/**
 * Post-process DEIM layout detection outputs.
 *
 * - Filters by confidence threshold
 * - Scales normalized [0,1] box coordinates to original image space
 * - Converts 1-indexed labels to 0-indexed category indices
 * - Maps category indices to category names
 */
export function deimPostprocess(
  outputs: DeimOutputs,
  origSize: OrigSize,
  confThreshold: number,
): DetectionResult[] {
  const { labels, boxes, scores, charCounts } = outputs
  const numDetections = labels.length
  const results: DetectionResult[] = []

  for (let i = 0; i < numDetections; i++) {
    if (scores[i] < confThreshold) continue

    const categoryIndex = Math.round(labels[i]) - 1

    const x1 = boxes[i * 4 + 0] * origSize.width
    const y1 = boxes[i * 4 + 1] * origSize.height
    const x2 = boxes[i * 4 + 2] * origSize.width
    const y2 = boxes[i * 4 + 3] * origSize.height

    const category = CATEGORY_NAMES[categoryIndex] ?? 'other'

    results.push({
      bbox: { x1, y1, x2, y2 },
      category,
      categoryIndex,
      score: scores[i],
      predCharCount: charCounts ? charCounts[i] : undefined,
    })
  }

  return results
}
