import ru from './ru.js';
import en from './en.js';

export const SUPPORTED_LOCALES = ['ru', 'en'];

/** Sync catalogs for utils/tests; kept as separate files for maintainability. */
export const translations = { ru, en };

export function translate(locale, key, params = {}) {
  const normalized = SUPPORTED_LOCALES.includes(locale) ? locale : 'ru';
  const template = translations[normalized][key] ?? translations.ru[key] ?? key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export function detectLocale() {
  try {
    const stored = localStorage.getItem('portfolio-balancer:locale');
    if (stored && SUPPORTED_LOCALES.includes(stored)) {
      return stored;
    }
  } catch {
    // ignore
  }

  const browser = navigator.language?.slice(0, 2).toLowerCase();
  return SUPPORTED_LOCALES.includes(browser) ? browser : 'ru';
}

export function saveLocale(locale) {
  try {
    localStorage.setItem('portfolio-balancer:locale', locale);
  } catch {
    // ignore
  }
}
