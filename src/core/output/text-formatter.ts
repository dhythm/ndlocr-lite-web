import type { OcrResult } from '../pipeline/types.ts'

/**
 * Format OCR result as plain text, following reading order.
 */
export function formatAsText(result: OcrResult): string {
  const pageTexts = result.pages.map(page => {
    const sortedRegions = [...page.regions].sort((a, b) => a.readingOrder - b.readingOrder)
    return sortedRegions
      .map(region => region.lines.map(line => line.text).join('\n'))
      .join('\n')
  })

  return pageTexts.join('\n\n--- Page Break ---\n\n')
}
