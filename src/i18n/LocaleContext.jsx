import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { detectLocale, saveLocale, translate } from './translations';

const LocaleContext = createContext({
  locale: 'ru',
  setLocale: () => {},
  t: (key, params) => translate('ru', key, params),
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale);

  const setLocale = (nextLocale) => {
    setLocaleState(nextLocale);
    saveLocale(nextLocale);
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, 'app.title');
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key, params) => translate(locale, key, params),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
