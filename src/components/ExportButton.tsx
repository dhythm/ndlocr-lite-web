import type { OcrResult } from '../core/pipeline/types.ts'
import { formatAsText } from '../core/output/text-formatter.ts'
import { formatAsJson } from '../core/output/json-formatter.ts'
import { formatAsXml } from '../core/output/xml-formatter.ts'

type Props = {
  result: OcrResult
}

type ExportFormat = 'text' | 'json' | 'xml'

const FORMAT_CONFIG: Record<ExportFormat, { label: string; ext: string; mime: string }> = {
  text: { label: 'TXT', ext: 'txt', mime: 'text/plain' },
  json: { label: 'JSON', ext: 'json', mime: 'application/json' },
  xml: { label: 'XML', ext: 'xml', mime: 'application/xml' },
}

function formatResult(result: OcrResult, format: ExportFormat): string {
  switch (format) {
    case 'text': return formatAsText(result)
    case 'json': return formatAsJson(result)
    case 'xml': return formatAsXml(result)
  }
}

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function ExportButton({ result }: Props) {
  function handleExport(format: ExportFormat) {
    const config = FORMAT_CONFIG[format]
    const content = formatResult(result, format)
    downloadFile(content, `ocr-result.${config.ext}`, config.mime)
  }

  return (
    <div className="export">
      <span className="export__label">結果をダウンロード:</span>
      {(Object.keys(FORMAT_CONFIG) as ExportFormat[]).map(format => (
        <button
          key={format}
          className="export__button"
          onClick={() => handleExport(format)}
        >
          {FORMAT_CONFIG[format].label}
        </button>
      ))}
    </div>
  )
}
