import type { OcrResult } from '../pipeline/types.ts'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format OCR result as PAGE XML.
 */
export function formatAsXml(result: OcrResult): string {
  const lines: string[] = []
  lines.push('<?xml version="1.0" encoding="UTF-8"?>')
  lines.push('<PcGts xmlns="http://schema.primaresearch.org/PAGE/gts/pagecontent/2013-07-15">')

  for (let i = 0; i < result.pages.length; i++) {
    const page = result.pages[i]
    lines.push(`  <Page imageWidth="${page.width}" imageHeight="${page.height}" pageNumber="${i + 1}">`)

    const sortedRegions = [...page.regions].sort((a, b) => a.readingOrder - b.readingOrder)

    for (const region of sortedRegions) {
      const { x1, y1, x2, y2 } = region.bbox
      lines.push(`    <TextRegion type="${escapeXml(region.category)}" readingOrder="${region.readingOrder}">`)
      lines.push(`      <Coords points="${x1},${y1} ${x2},${y1} ${x2},${y2} ${x1},${y2}"/>`)

      for (const line of region.lines) {
        const lb = line.bbox
        lines.push(`      <TextLine>`)
        lines.push(`        <Coords points="${lb.x1},${lb.y1} ${lb.x2},${lb.y1} ${lb.x2},${lb.y2} ${lb.x1},${lb.y2}"/>`)
        lines.push(`        <TextEquiv conf="${line.confidence.toFixed(4)}">`)
        lines.push(`          <Unicode>${escapeXml(line.text)}</Unicode>`)
        lines.push(`        </TextEquiv>`)
        lines.push(`      </TextLine>`)
      }

      lines.push(`    </TextRegion>`)
    }

    lines.push(`  </Page>`)
  }

  lines.push('</PcGts>')
  return lines.join('\n')
}
