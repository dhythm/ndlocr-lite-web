import type { ProgressInfo } from '../core/pipeline/types.ts'

type Props = {
  progress: ProgressInfo
}

const STAGE_LABELS: Record<string, string> = {
  'loading-model': 'モデル読み込み中',
  'detecting-layout': 'レイアウト検出中',
  'recognizing-text': 'テキスト認識中',
  'ordering-text': '読み順整序中',
  'complete': '完了',
}

export function ProgressIndicator({ progress }: Props) {
  const percent = Math.round(progress.progress * 100)
  const stageLabel = STAGE_LABELS[progress.stage] ?? progress.stage

  return (
    <div className="progress">
      <div className="progress__header">
        <span className="progress__stage">{stageLabel}</span>
        <span className="progress__percent">{percent}%</span>
      </div>
      <div className="progress__bar">
        <div
          className="progress__fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className="progress__message">{progress.message}</p>
      {progress.detail && (
        <p className="progress__detail">{progress.detail}</p>
      )}
    </div>
  )
}
