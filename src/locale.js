import { detectLocale, saveLocale, translate } from './i18n/translations';

let locale = detectLocale();
const listeners = new Set();

function applyDocumentLocale(nextLocale) {
  document.documentElement.lang = nextLocale;
  document.title = translate(nextLocale, 'app.title');
}

export function getLocale() {
  return locale;
}

export function t(key, params) {
  return translate(locale, key, params);
}

export function setLocale(nextLocale) {
  if (nextLocale === locale) {
    return;
  }
  locale = nextLocale;
  saveLocale(nextLocale);
  applyDocumentLocale(nextLocale);
  listeners.forEach((listener) => listener(locale));
}

export function subscribeLocale(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function initLocale() {
  applyDocumentLocale(locale);
}
