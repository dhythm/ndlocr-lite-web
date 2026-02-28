import type { OCRResult } from '../../types/ocr'

type Props = {
  results: OCRResult[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  t: Record<string, Record<string, string>>
}

export function ResultPanel({ results, selectedIndex, onSelectIndex, t }: Props) {
  const result = results[selectedIndex]
  if (!result) return null

  return (
    <div className="result-panel">
      {results.length > 1 && (
        <div className="pagination">
          <button
            disabled={selectedIndex === 0}
            onClick={() => onSelectIndex(selectedIndex - 1)}
          >
            &larr;
          </button>
          <select
            value={selectedIndex}
            onChange={(e) => onSelectIndex(Number(e.target.value))}
          >
            {results.map((r, i) => (
              <option key={r.id} value={i}>{r.fileName}</option>
            ))}
          </select>
          <button
            disabled={selectedIndex === results.length - 1}
            onClick={() => onSelectIndex(selectedIndex + 1)}
          >
            &rarr;
          </button>
        </div>
      )}
      <div className="result-panel__header">
        <h3>{result.fileName}</h3>
        <div className="result-panel__stats">
          <span>{result.textBlocks.length} {t.result.regions}</span>
          <span> &middot; </span>
          <span>{(result.processingTimeMs / 1000).toFixed(1)}{t.result.seconds}</span>
        </div>
      </div>
      <div className="result-panel__text">
        {result.fullText || t.result.noText}
      </div>
    </div>
  )
}
