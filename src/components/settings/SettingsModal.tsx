import { useState } from 'react'
import { clearModelCache } from '../../worker/model-loader'

type Props = {
  isOpen: boolean
  onClose: () => void
  t: Record<string, Record<string, string>>
}

export function SettingsModal({ isOpen, onClose, t }: Props) {
  const [cleared, setCleared] = useState(false)

  if (!isOpen) return null

  async function handleClearCache() {
    await clearModelCache()
    setCleared(true)
    setTimeout(() => setCleared(false), 3000)
  }

  return (
    <div className="settings-modal__backdrop" onClick={onClose}>
      <div className="settings-modal__content" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h3>{t.settings.title}</h3>
          <button className="settings-modal__close" onClick={onClose}>{t.settings.close}</button>
        </div>
        <div className="settings-modal__body">
          <button className="settings-modal__btn" onClick={handleClearCache}>
            {cleared ? t.settings.cacheCleared : t.settings.clearCache}
          </button>
        </div>
      </div>
    </div>
  )
}
