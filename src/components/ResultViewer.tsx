import { useRef, useEffect, useState } from 'react'
import type { OcrResult, OcrPageResult } from '../core/pipeline/types.ts'

type Props = {
  result: OcrResult
  imageUrls: string[]
}

const CATEGORY_COLORS: Record<string, string> = {
  body: '#4CAF50',
  column: '#2196F3',
  caption: '#FF9800',
  footnote: '#9C27B0',
  header: '#F44336',
  footer: '#607D8B',
  title: '#E91E63',
  page_number: '#795548',
  figure: '#00BCD4',
  table: '#FFEB3B',
  equation: '#8BC34A',
  heading: '#3F51B5',
  list: '#009688',
  abstract: '#FF5722',
  advertisement: '#CDDC39',
  separator: '#9E9E9E',
  other: '#757575',
}

export function ResultViewer({ result, imageUrls }: Props) {
  const [currentPage, setCurrentPage] = useState(0)
  const [showOverlay, setShowOverlay] = useState(true)

  const totalPages = result.pages.length
  const page = result.pages[currentPage]
  const imageUrl = imageUrls[currentPage]

  return (
    <div className="result-viewer">
      {totalPages > 1 && (
        <div className="result-viewer__pagination">
          <button
            onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
            disabled={currentPage === 0}
          >
            前へ
          </button>
          <span>{currentPage + 1} / {totalPages} ページ</span>
          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={currentPage === totalPages - 1}
          >
            次へ
          </button>
        </div>
      )}

      <div className="result-viewer__controls">
        <label>
          <input
            type="checkbox"
            checked={showOverlay}
            onChange={(e) => setShowOverlay(e.target.checked)}
          />
          バウンディングボックスを表示
        </label>
      </div>

      <div className="result-viewer__content">
        <div className="result-viewer__image-panel">
          {imageUrl && page && (
            <PageCanvas
              imageUrl={imageUrl}
              page={page}
              showOverlay={showOverlay}
            />
          )}
        </div>

        <div className="result-viewer__text-panel">
          <h3>認識テキスト</h3>
          {page && <PageText page={page} />}
        </div>
      </div>
    </div>
  )
}

function PageCanvas({ imageUrl, page, showOverlay }: {
  imageUrl: string
  page: OcrPageResult
  showOverlay: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    const img = new Image()
    img.src = imageUrl
    img.onload = () => {
      imgRef.current = img
      draw()
    }
  }, [imageUrl])

  useEffect(() => {
    draw()
  }, [showOverlay, page])

  function draw() {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(img, 0, 0)

    if (!showOverlay) return

    // Draw detection bounding boxes
    for (const detection of page.detections) {
      const { x1, y1, x2, y2 } = detection.bbox
      const color = CATEGORY_COLORS[detection.category] ?? '#757575'

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.strokeRect(x1, y1, x2 - x1, y2 - y1)

      // Label
      ctx.font = '12px sans-serif'
      const label = `${detection.category} (${(detection.score * 100).toFixed(0)}%)`
      const textWidth = ctx.measureText(label).width
      ctx.fillStyle = color
      ctx.fillRect(x1, y1 - 16, textWidth + 4, 16)
      ctx.fillStyle = '#fff'
      ctx.fillText(label, x1 + 2, y1 - 4)
    }
  }

  return (
    <canvas
      ref={canvasRef}
      className="result-viewer__canvas"
    />
  )
}

function PageText({ page }: { page: OcrPageResult }) {
  const sortedRegions = [...page.regions].sort((a, b) => a.readingOrder - b.readingOrder)

  if (sortedRegions.length === 0) {
    return <p className="result-viewer__no-text">テキストが検出されませんでした</p>
  }

  return (
    <div className="result-viewer__regions">
      {sortedRegions.map((region, ri) => (
        <div key={ri} className="result-viewer__region">
          <div
            className="result-viewer__region-header"
            style={{ borderLeftColor: CATEGORY_COLORS[region.category] ?? '#757575' }}
          >
            {region.category} (読み順: {region.readingOrder + 1})
          </div>
          {region.lines.map((line, li) => (
            <p key={li} className="result-viewer__line">
              {line.text}
              <span className="result-viewer__confidence">
                {(line.confidence * 100).toFixed(1)}%
              </span>
            </p>
          ))}
        </div>
      ))}
    </div>
  )
}
