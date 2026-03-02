'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, TranslationKeys } from './translations'

export type Lang = 'da' | 'en'

type I18nContext = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslationKeys
}

const I18nCtx = createContext<I18nContext>({
  lang: 'da',
  setLang: () => {},
  t: translations.da,
})

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('da')

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Lang | null
    if (saved && translations[saved]) setLangState(saved)
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    localStorage.setItem('lang', l)
    document.documentElement.lang = l
  }

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  return (
    <I18nCtx.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </I18nCtx.Provider>
  )
}

export const useLang = () => useContext(I18nCtx)
export const useT = () => useContext(I18nCtx).t
