import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { detectLocale, saveLocale, SUPPORTED_LOCALES, translate } from './i18n/translations';

const LocaleContext = createContext(null);

function applyDocumentLocale(nextLocale) {
  document.documentElement.lang = nextLocale;
  document.title = translate(nextLocale, 'app.title');
}

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => detectLocale());

  useEffect(() => {
    applyDocumentLocale(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale) => {
    if (!SUPPORTED_LOCALES.includes(nextLocale)) {
      return;
    }
    setLocaleState((prev) => {
      if (prev === nextLocale) {
        return prev;
      }
      saveLocale(nextLocale);
      return nextLocale;
    });
  }, []);

  const t = useCallback((key, params) => translate(locale, key, params), [locale]);

  const value = useMemo(() => ({ locale, t, setLocale }), [locale, t, setLocale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}
