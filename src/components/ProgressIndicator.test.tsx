import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ProgressIndicator } from './ProgressIndicator.tsx'

describe('ProgressIndicator', () => {
  it('renders progress percentage and stage label', () => {
    render(
      <ProgressIndicator
        progress={{
          stage: 'detecting-layout',
          progress: 0.5,
          message: 'Detecting layout...',
        }}
      />,
    )

    expect(screen.getByText('レイアウト検出中')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('Detecting layout...')).toBeInTheDocument()
  })

  it('renders detail when provided', () => {
    render(
      <ProgressIndicator
        progress={{
          stage: 'recognizing-text',
          progress: 0.3,
          message: 'Recognizing...',
          detail: '日本語テスト',
        }}
      />,
    )

    expect(screen.getByText('テキスト認識中')).toBeInTheDocument()
    expect(screen.getByText('日本語テスト')).toBeInTheDocument()
  })

  it('renders progress bar with correct width', () => {
    const { container } = render(
      <ProgressIndicator
        progress={{
          stage: 'loading-model',
          progress: 0.75,
          message: 'Loading...',
        }}
      />,
    )

    const fill = container.querySelector('.progress__fill') as HTMLElement
    expect(fill.style.width).toBe('75%')
  })
})
