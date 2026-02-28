import type { OCRJobState } from '../../types/ocr'

type Props = {
  jobState: OCRJobState
  t: Record<string, Record<string, string>>
}

const MODEL_KEYS = ['layout', 'rec30', 'rec50', 'rec100'] as const

export function ProgressBar({ jobState, t }: Props) {
  const percent = Math.round(jobState.stageProgress * 100)
  const stageLabel = (t.progress as Record<string, string>)[jobState.stage] ?? jobState.stage

  return (
    <div className="progress-panel">
      <div className="progress-panel__header">
        <span className="progress-panel__stage">{stageLabel}</span>
        <span className="progress-panel__percent">{percent}%</span>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      {jobState.message && (
        <p className="progress-panel__message">{jobState.message}</p>
      )}
      {jobState.status === 'loading_model' && (
        <p className="progress-panel__info">
          {jobState.currentFileIndex > 0 && `${jobState.currentFileIndex}/${jobState.totalFiles}`}
        </p>
      )}
      {jobState.modelProgress && (
        <div className="progress-panel__models">
          {MODEL_KEYS.map((key) => (
            <div key={key} className="progress-panel__model">
              <span className="progress-panel__model-label">{key}</span>
              <div className="progress-bar progress-bar--small">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.round((jobState.modelProgress?.[key] ?? 0) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
