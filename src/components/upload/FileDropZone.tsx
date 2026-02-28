import { useState, useRef, useEffect, type DragEvent, type ChangeEvent } from 'react'

const ACCEPT = 'image/jpeg,image/png,image/webp,image/bmp,image/tiff,application/pdf'

type Props = {
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  t: Record<string, Record<string, string>>
}

export function FileDropZone({ onFilesSelected, disabled = false, t }: Props) {
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      if (disabled) return
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length > 0) {
        e.preventDefault()
        onFilesSelected(files)
      }
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [disabled, onFilesSelected])

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
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) onFilesSelected(files)
  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length > 0) onFilesSelected(files)
    e.target.value = ''
  }

  async function handleSampleImage() {
    if (disabled) return
    try {
      const response = await fetch('/kumonoito.png')
      const blob = await response.blob()
      const file = new File([blob], 'kumonoito.png', { type: 'image/png' })
      onFilesSelected([file])
    } catch {
      // Sample image not available, silently ignore
    }
  }

  const className = [
    'upload-zone',
    dragOver ? 'upload-zone--drag-over' : '',
    disabled ? 'upload-zone--disabled' : '',
  ].filter(Boolean).join(' ')

  return (
    <div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click() }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPT}
        multiple
        onChange={handleFileChange}
        hidden
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is not in TS types
        webkitdirectory=""
        onChange={handleFileChange}
        hidden
      />
      <p className="upload-zone__text">{t.upload.dragDrop}</p>
      <p className="upload-zone__text">{t.upload.clickSelect}</p>
      <p className="upload-zone__hint">{t.upload.pasteHint}</p>
      <p className="upload-zone__hint">{t.upload.formats}</p>
      <div className="upload-zone__actions" onClick={(e) => e.stopPropagation()}>
        <button
          className="upload-zone__btn"
          onClick={() => folderInputRef.current?.click()}
          disabled={disabled}
        >
          {t.upload.selectFolder}
        </button>
        <button
          className="upload-zone__btn"
          onClick={handleSampleImage}
          disabled={disabled}
        >
          {t.upload.sampleImage}
        </button>
      </div>
    </div>
  )
}
