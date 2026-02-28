import { useState, useRef, type DragEvent, type ChangeEvent } from 'react'

type Props = {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,application/pdf'

export function ImageUploader({ onFileSelect, disabled = false }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleDragOver(e: DragEvent) {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  function handleDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) onFileSelect(file)
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFileSelect(file)
    // Reset so the same file can be selected again
    e.target.value = ''
  }

  function handleClick() {
    if (!disabled) inputRef.current?.click()
  }

  return (
    <div
      className={`uploader ${dragOver ? 'uploader--drag-over' : ''} ${disabled ? 'uploader--disabled' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick() }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        hidden
      />
      <p className="uploader__text">
        画像またはPDFをドラッグ&ドロップ
        <br />
        またはクリックしてファイルを選択
      </p>
      <p className="uploader__hint">
        対応形式: JPEG, PNG, WebP, BMP, TIFF, PDF
      </p>
    </div>
  )
}
