import { useState } from 'react'
import type { OCRResult } from '../../types/ocr'
import { formatResultText, copyToClipboard, downloadAsText } from '../../utils/textExport'

type Props = {
  results: OCRResult[]
  ignoreLineBreaks: boolean
  onToggleIgnoreLineBreaks: () => void
  includeFileName: boolean
  onToggleIncludeFileName: () => void
  t: Record<string, Record<string, string>>
}

export function ResultActions({
  results, ignoreLineBreaks, onToggleIgnoreLineBreaks,
  includeFileName, onToggleIncludeFileName, t,
}: Props) {
  const [copied, setCopied] = useState(false)

  const text = formatResultText(results, { ignoreLineBreaks, includeFileName })

  async function handleCopy() {
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleDownload() {
    downloadAsText(text, 'ocr-result.txt')
  }

  return (
    <div className="result-actions">
      <button className="result-actions__btn" onClick={handleCopy}>
        {copied ? t.result.copied : t.result.copy}
      </button>
      <button className="result-actions__btn" onClick={handleDownload}>
        {t.result.download}
      </button>
      <label className={`result-actions__btn ${ignoreLineBreaks ? 'result-actions__btn--active' : ''}`}>
        <input
          type="checkbox"
          checked={ignoreLineBreaks}
          onChange={onToggleIgnoreLineBreaks}
          hidden
        />
        {t.result.ignoreLineBreaks}
      </label>
      <label className={`result-actions__btn ${includeFileName ? 'result-actions__btn--active' : ''}`}>
        <input
          type="checkbox"
          checked={includeFileName}
          onChange={onToggleIncludeFileName}
          hidden
        />
        {t.result.includeFileName}
      </label>
    </div>
  )
}
