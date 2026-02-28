import { useEffect, useState } from 'react'
import type { DBRunEntry } from '../../types/db'
import { getRunEntries, clearRunEntries } from '../../utils/db'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSelectEntry: (entry: DBRunEntry) => void
  t: Record<string, Record<string, string>>
}

export function HistoryPanel({ isOpen, onClose, onSelectEntry, t }: Props) {
  const [entries, setEntries] = useState<DBRunEntry[]>([])

  useEffect(() => {
    if (isOpen) {
      getRunEntries().then(setEntries).catch(() => setEntries([]))
    }
  }, [isOpen])

  if (!isOpen) return null

  async function handleDeleteAll() {
    await clearRunEntries()
    setEntries([])
  }

  return (
    <div className="history-panel__backdrop" onClick={onClose}>
      <div className="history-panel__content" onClick={(e) => e.stopPropagation()}>
        <div className="history-panel__header">
          <h3>{t.history.title}</h3>
          <div className="history-panel__actions">
            {entries.length > 0 && (
              <button className="history-panel__delete" onClick={handleDeleteAll}>
                {t.history.deleteAll}
              </button>
            )}
            <button className="history-panel__close" onClick={onClose}>{t.history.close}</button>
          </div>
        </div>
        {entries.length === 0 ? (
          <p className="history-panel__empty">{t.history.empty}</p>
        ) : (
          <div className="history-panel__list">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="history-entry"
                onClick={() => { onSelectEntry(entry); onClose() }}
              >
                <div className="history-entry__time">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
                <div className="history-entry__files">
                  {entry.files.length} {t.history.files}
                  {entry.files.length > 0 && ` - ${entry.files[0].fileName}`}
                  {entry.files.length > 1 && ` +${entry.files.length - 1}`}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
