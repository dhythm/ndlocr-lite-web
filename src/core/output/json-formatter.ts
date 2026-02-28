import type { OcrResult } from '../pipeline/types.ts'

/**
 * Format OCR result as structured JSON.
 */
export function formatAsJson(result: OcrResult): string {
  return JSON.stringify(result, null, 2)
}
