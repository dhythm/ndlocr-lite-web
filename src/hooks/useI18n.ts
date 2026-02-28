import { useState, useCallback } from 'react'
import {
  type Lang,
  type Translations,
  getTranslation,
  getStoredLang,
  storeLang,
} from '../i18n'

export function useI18n() {
  const [lang, setLangState] = useState<Lang>(getStoredLang)

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang)
    storeLang(newLang)
  }, [])

  const t: Translations = getTranslation(lang)

  return { lang, setLang, t }
}
