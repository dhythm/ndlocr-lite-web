import { ja } from './ja'
import { en } from './en'

export type Lang = 'ja' | 'en'

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepStringify<T[K]>
}

export type Translations = DeepStringify<typeof ja>

const translations: Record<Lang, Translations> = { ja, en }

export function getTranslation(lang: Lang): Translations {
  return translations[lang]
}

export function getStoredLang(): Lang {
  const stored = localStorage.getItem('ndlocr-lang')
  if (stored === 'ja' || stored === 'en') return stored
  return navigator.language.startsWith('ja') ? 'ja' : 'en'
}

export function storeLang(lang: Lang): void {
  localStorage.setItem('ndlocr-lang', lang)
}
