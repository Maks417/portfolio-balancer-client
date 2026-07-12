import React, { createContext, useContext, useMemo, useState } from 'react';
import { detectLocale, saveLocale, translate } from './translations';

const LocaleContext = createContext({
  locale: 'ru',
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(detectLocale);

  const setLocale = (nextLocale) => {
    setLocaleState(nextLocale);
    saveLocale(nextLocale);
  };

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key) => translate(locale, key),
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}
