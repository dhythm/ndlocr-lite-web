import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ImageUploader } from './ImageUploader.tsx'

describe('ImageUploader', () => {
  it('renders upload instructions', () => {
    render(<ImageUploader onFileSelect={vi.fn()} />)
    expect(screen.getByText(/画像またはPDF/)).toBeInTheDocument()
    expect(screen.getByText(/JPEG, PNG/)).toBeInTheDocument()
  })

  it('calls onFileSelect when a file is dropped', () => {
    const onFileSelect = vi.fn()
    render(<ImageUploader onFileSelect={onFileSelect} />)

    const dropzone = screen.getByRole('button')
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    expect(onFileSelect).toHaveBeenCalledWith(file)
  })

  it('calls onFileSelect when a file is selected via input', () => {
    const onFileSelect = vi.fn()
    render(<ImageUploader onFileSelect={onFileSelect} />)

    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['dummy'], 'test.jpg', { type: 'image/jpeg' })

    fireEvent.change(input, { target: { files: [file] } })

    expect(onFileSelect).toHaveBeenCalledWith(file)
  })

  it('does not call onFileSelect when disabled and file is dropped', () => {
    const onFileSelect = vi.fn()
    render(<ImageUploader onFileSelect={onFileSelect} disabled />)

    const dropzone = screen.getByRole('button')
    const file = new File(['dummy'], 'test.png', { type: 'image/png' })

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    })

    expect(onFileSelect).not.toHaveBeenCalled()
  })

  it('applies drag-over class on dragOver', () => {
    render(<ImageUploader onFileSelect={vi.fn()} />)
    const dropzone = screen.getByRole('button')

    fireEvent.dragOver(dropzone)
    expect(dropzone).toHaveClass('uploader--drag-over')

    fireEvent.dragLeave(dropzone)
    expect(dropzone).not.toHaveClass('uploader--drag-over')
  })
})
