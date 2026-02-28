import type { OCRResult } from '../types/ocr'

export function formatResultText(
  results: OCRResult[],
  options: { includeFileName?: boolean; ignoreLineBreaks?: boolean } = {},
): string {
  const parts: string[] = []

  for (const result of results) {
    if (options.includeFileName) {
      parts.push(`--- ${result.fileName} ---`)
    }

    let text = result.fullText
    if (options.ignoreLineBreaks) {
      text = text.replace(/\n/g, '')
    }
    parts.push(text)
  }

  return parts.join('\n')
}

export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text)
}

export function downloadAsText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
