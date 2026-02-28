import { useRef, useState, useEffect, useCallback } from 'react'

type Props = {
  imageDataUrl: string
  onRegionSelect?: (imageData: ImageData) => void
}

export function PreviewImageViewer({ imageDataUrl, onRegionSelect }: Props) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 })
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null)

  const updateSize = useCallback(() => {
    if (!imgRef.current) return
    setImgSize({ width: imgRef.current.clientWidth, height: imgRef.current.clientHeight })
    setNaturalSize({ width: imgRef.current.naturalWidth, height: imgRef.current.naturalHeight })
  }, [])

  useEffect(() => {
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [updateSize, imageDataUrl])

  const scaleX = naturalSize.width > 0 ? imgSize.width / naturalSize.width : 1
  const scaleY = naturalSize.height > 0 ? imgSize.height / naturalSize.height : 1

  function getRelativePos(e: React.MouseEvent) {
    const rect = imgRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function handleMouseDown(e: React.MouseEvent) {
    if (!onRegionSelect) return
    const pos = getRelativePos(e)
    setDragStart(pos)
    setDragCurrent(pos)
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!dragStart) return
    setDragCurrent(getRelativePos(e))
  }

  function handleMouseUp() {
    if (!dragStart || !dragCurrent || !onRegionSelect) {
      setDragStart(null)
      setDragCurrent(null)
      return
    }

    // Display coords → natural coords
    const x1 = Math.min(dragStart.x, dragCurrent.x) / scaleX
    const y1 = Math.min(dragStart.y, dragCurrent.y) / scaleY
    const x2 = Math.max(dragStart.x, dragCurrent.x) / scaleX
    const y2 = Math.max(dragStart.y, dragCurrent.y) / scaleY
    const w = x2 - x1
    const h = y2 - y1

    setDragStart(null)
    setDragCurrent(null)

    if (w < 15 || h < 15) return

    const img = imgRef.current!
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(w)
    canvas.height = Math.round(h)
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, x1, y1, w, h, 0, 0, Math.round(w), Math.round(h))
    const imageData = ctx.getImageData(0, 0, Math.round(w), Math.round(h))
    onRegionSelect(imageData)
  }

  const selectionRect = dragStart && dragCurrent
    ? {
        left: Math.min(dragStart.x, dragCurrent.x),
        top: Math.min(dragStart.y, dragCurrent.y),
        width: Math.abs(dragCurrent.x - dragStart.x),
        height: Math.abs(dragCurrent.y - dragStart.y),
      }
    : null

  return (
    <div
      className="preview-viewer"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        ref={imgRef}
        src={imageDataUrl}
        className="preview-viewer__image"
        onLoad={updateSize}
        draggable={false}
        alt=""
      />
      {imgSize.width > 0 && (
        <div
          className="preview-viewer__overlay"
          style={{ width: imgSize.width, height: imgSize.height }}
        >
          {selectionRect && (
            <div
              className="selection-rect"
              style={{
                left: selectionRect.left,
                top: selectionRect.top,
                width: selectionRect.width,
                height: selectionRect.height,
              }}
            />
          )}
        </div>
      )}
    </div>
  )
}
