/**
 * Reading order processor.
 * Auto-detects vertical vs horizontal text and orders accordingly.
 */
import type { TextBlock } from '../types/ocr'

export class ReadingOrderProcessor {
  private detectIsVertical(blocks: TextBlock[]): boolean {
    const verticalCount = blocks.filter((b) => b.width < b.height).length
    return verticalCount * 2 >= blocks.length
  }

  private calcThreshold(blocks: TextBlock[], isVertical: boolean): number {
    const sizes = isVertical ? blocks.map((b) => b.width) : blocks.map((b) => b.height)
    const sorted = [...sizes].sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    return Math.max(median * 0.3, 1)
  }

  process(textBlocks: TextBlock[]): TextBlock[] {
    if (!textBlocks || textBlocks.length === 0) return []

    const validBlocks = textBlocks.filter(
      (b) => b.confidence >= 0.1 && b.text && b.text.trim().length > 0,
    )
    if (validBlocks.length === 0) return []

    const isVertical = this.detectIsVertical(validBlocks)
    const threshold = this.calcThreshold(validBlocks, isVertical)

    let ordered: TextBlock[]
    if (isVertical) {
      ordered = this.processVertical(validBlocks, threshold)
    } else {
      ordered = this.processHorizontal(validBlocks, threshold)
    }

    return ordered.map((block, index) => ({ ...block, readingOrder: index + 1 }))
  }

  private processVertical(blocks: TextBlock[], threshold: number): TextBlock[] {
    const columns = this.groupIntoColumns(blocks, threshold)
    // Right to left
    const sorted = columns.sort((a, b) => {
      const avgXA = a.reduce((s, bl) => s + bl.x + bl.width / 2, 0) / a.length
      const avgXB = b.reduce((s, bl) => s + bl.x + bl.width / 2, 0) / b.length
      return avgXB - avgXA
    })
    return sorted.flatMap((col) => col.sort((a, b) => a.y - b.y))
  }

  private processHorizontal(blocks: TextBlock[], threshold: number): TextBlock[] {
    const lines = this.groupIntoLines(blocks, threshold)
    const sortedLines = lines.sort((a, b) => {
      const avgYA = a.reduce((s, bl) => s + bl.y, 0) / a.length
      const avgYB = b.reduce((s, bl) => s + bl.y, 0) / b.length
      return avgYA - avgYB
    })
    return sortedLines.flatMap((line) => line.sort((a, b) => a.x - b.x))
  }

  private groupIntoColumns(blocks: TextBlock[], threshold: number): TextBlock[][] {
    const columns: TextBlock[][] = []
    for (const block of blocks) {
      const cx = block.x + block.width / 2
      const col = columns.find((c) => {
        const avgX = c.reduce((s, b) => s + b.x + b.width / 2, 0) / c.length
        return Math.abs(cx - avgX) <= threshold
      })
      if (col) col.push(block)
      else columns.push([block])
    }
    return columns
  }

  private groupIntoLines(blocks: TextBlock[], threshold: number): TextBlock[][] {
    const lines: TextBlock[][] = []
    for (const block of blocks) {
      const cy = block.y + block.height / 2
      const line = lines.find((l) => {
        const avgY = l.reduce((s, b) => s + b.y + b.height / 2, 0) / l.length
        return Math.abs(cy - avgY) <= threshold
      })
      if (line) line.push(block)
      else lines.push([block])
    }
    return lines
  }
}
