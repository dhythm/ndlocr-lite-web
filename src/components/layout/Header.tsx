type Props = {
  isReady: boolean
  hasImages: boolean
  isProcessing: boolean
  onStartOCR: () => void
  onOpenSettings: () => void
  onOpenHistory: () => void
  darkMode: boolean
  onToggleDarkMode: () => void
  lang: string
  onToggleLang: () => void
  t: Record<string, Record<string, string>>
}

export function Header({
  isReady, hasImages, isProcessing,
  onStartOCR, onOpenSettings, onOpenHistory,
  darkMode, onToggleDarkMode, lang, onToggleLang, t,
}: Props) {
  return (
    <header className="header">
      <h1 className="header__title">{t.app.title}</h1>
      <div className="header__actions">
        {isReady && hasImages && !isProcessing && (
          <button className="header__btn header__btn--primary" onClick={onStartOCR}>
            {t.header.startOCR}
          </button>
        )}
        <button className="header__btn" onClick={onToggleLang} title={t.header.language}>
          {lang === 'ja' ? 'EN' : 'JA'}
        </button>
        <button className="header__btn" onClick={onToggleDarkMode} title={t.header.darkMode}>
          {darkMode ? '☀' : '☾'}
        </button>
        <button className="header__btn" onClick={onOpenHistory} title={t.header.history}>
          {t.header.history}
        </button>
        <button className="header__btn" onClick={onOpenSettings} title={t.header.settings}>
          {t.header.settings}
        </button>
      </div>
    </header>
  )
}
