import { useRef, useEffect, useState, useCallback } from 'react'
import type { TextBlock } from '../../types/ocr'

type Props = {
  imageDataUrl: string
  textBlocks: TextBlock[]
  showBbox: boolean
  onRegionSelect?: (imageData: ImageData) => void
  selectedBlockIndex?: number | null
}

const BBOX_COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#E91E63', '#795548']

export function ImageViewer({ imageDataUrl, textBlocks, showBbox, onRegionSelect, selectedBlockIndex }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [selecting, setSelecting] = useState(false)
  const [selStart, setSelStart] = useState({ x: 0, y: 0 })
  const [selEnd, setSelEnd] = useState({ x: 0, y: 0 })
  const [scale, setScale] = useState(1)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const img = imgRef.current
    if (!canvas || !img) return

    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    if (showBbox) {
      textBlocks.forEach((block, i) => {
        const color = BBOX_COLORS[i % BBOX_COLORS.length]
        ctx.strokeStyle = color
        ctx.lineWidth = 2
        ctx.strokeRect(block.x, block.y, block.width, block.height)

        // Semi-transparent fill
        ctx.fillStyle = color + '20'
        ctx.fillRect(block.x, block.y, block.width, block.height)

        // Selected block highlight
        if (selectedBlockIndex === i) {
          ctx.fillStyle = color + '40'
          ctx.fillRect(block.x, block.y, block.width, block.height)
        }

        // Label
        const label = `${block.readingOrder}`
        ctx.font = '14px sans-serif'
        const tw = ctx.measureText(label).width
        ctx.fillStyle = color
        ctx.fillRect(block.x, block.y - 18, tw + 6, 18)
        ctx.fillStyle = '#fff'
        ctx.fillText(label, block.x + 3, block.y - 4)
      })
    }
  }, [imageDataUrl, textBlocks, showBbox, selectedBlockIndex])

  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      draw()
      // Calculate display scale
      if (containerRef.current && canvasRef.current) {
        const displayWidth = canvasRef.current.getBoundingClientRect().width
        setScale(img.naturalWidth / displayWidth)
      }
    }
    img.src = imageDataUrl
  }, [imageDataUrl, draw])

  useEffect(() => { draw() }, [draw])

  function getCanvasPos(e: React.MouseEvent): { x: number; y: number } {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (e.clientX - rect.left) * scale,
      y: (e.clientY - rect.top) * scale,
    }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!onRegionSelect) return
    const pos = getCanvasPos(e)
    setSelStart(pos)
    setSelEnd(pos)
    setSelecting(true)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!selecting) return
    setSelEnd(getCanvasPos(e))
  }

  function handleMouseUp() {
    if (!selecting || !onRegionSelect) { setSelecting(false); return }
    setSelecting(false)

    const x1 = Math.min(selStart.x, selEnd.x)
    const y1 = Math.min(selStart.y, selEnd.y)
    const x2 = Math.max(selStart.x, selEnd.x)
    const y2 = Math.max(selStart.y, selEnd.y)
    const w = x2 - x1
    const h = y2 - y1

    if (w < 20 || h < 20) return

    const img = imgRef.current!
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = img.naturalWidth
    tempCanvas.height = img.naturalHeight
    const tempCtx = tempCanvas.getContext('2d')!
    tempCtx.drawImage(img, 0, 0)
    const imageData = tempCtx.getImageData(Math.round(x1), Math.round(y1), Math.round(w), Math.round(h))
    onRegionSelect(imageData)
  }

  const selRect = selecting ? {
    left: Math.min(selStart.x, selEnd.x) / scale,
    top: Math.min(selStart.y, selEnd.y) / scale,
    width: Math.abs(selEnd.x - selStart.x) / scale,
    height: Math.abs(selEnd.y - selStart.y) / scale,
  } : null

  return (
    <div className="viewer__image-panel" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="viewer__canvas"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setSelecting(false)}
      />
      {selRect && (
        <div
          className="selection-rect"
          style={{
            left: selRect.left,
            top: selRect.top,
            width: selRect.width,
            height: selRect.height,
          }}
        />
      )}
    </div>
  )
}
