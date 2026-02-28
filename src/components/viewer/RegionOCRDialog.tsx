import { useEffect, useState } from 'react'
import type { TextBlock } from '../../types/ocr'

type Props = {
  imageData: ImageData | null
  result: { textBlocks: TextBlock[]; fullText: string } | null
  isProcessing: boolean
  onClose: () => void
  t: Record<string, Record<string, string>>
}

export function RegionOCRDialog({ imageData, result, isProcessing, onClose, t }: Props) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!imageData) { setImageUrl(null); return }
    const canvas = document.createElement('canvas')
    canvas.width = imageData.width
    canvas.height = imageData.height
    const ctx = canvas.getContext('2d')!
    ctx.putImageData(imageData, 0, 0)
    setImageUrl(canvas.toDataURL('image/png'))
  }, [imageData])

  if (!imageData) return null

  async function handleCopy() {
    if (result?.fullText) {
      await navigator.clipboard.writeText(result.fullText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="region-dialog__backdrop" onClick={onClose}>
      <div className="region-dialog__content" onClick={(e) => e.stopPropagation()}>
        <div className="region-dialog__header">
          <h3>{t.viewer.regionOCR}</h3>
          <button className="region-dialog__close" onClick={onClose}>{t.viewer.close}</button>
        </div>
        {imageUrl && <img className="region-dialog__image" src={imageUrl} alt="Selected region" />}
        <div className="region-dialog__body">
          {isProcessing ? (
            <p className="region-dialog__processing">{t.viewer.processing}</p>
          ) : result ? (
            <>
              <pre className="region-dialog__text">{result.fullText || t.result.noText}</pre>
              {result.fullText && (
                <button className="region-dialog__copy" onClick={handleCopy}>
                  {copied ? t.result.copied : t.result.copy}
                </button>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
