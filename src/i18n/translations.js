export const SUPPORTED_LOCALES = ['ru', 'en'];

export const translations = {
  ru: {
    'app.title': 'Балансировщик портфеля',
    'app.subtitle':
      'Укажите текущие позиции и целевую долю акций/облигаций — подскажем, сколько докупить или как перераспределить активы.',
    'mode.contribution': 'Распределить новый взнос',
    'mode.rebalance': 'Полная балансировка (покупка и продажа)',
    'action.calculate': 'Рассчитать',
    'action.share': 'Поделиться сценарием',
    'action.reset': 'Сбросить черновик',
    'action.copy': 'Копировать результат',
    'action.downloadCsv': 'Скачать CSV',
    'action.import': 'Импорт CSV',
    'action.compare': 'Сравнить сценарии',
    'action.library': 'Библиотека сценариев',
    'locale.label': 'Язык',
  },
  en: {
    'app.title': 'Portfolio Balancer',
    'app.subtitle':
      'Enter current positions and a target stocks/bonds allocation — we will suggest buys or a full rebalance.',
    'mode.contribution': 'Allocate new contribution',
    'mode.rebalance': 'Full rebalance (buy and sell)',
    'action.calculate': 'Calculate',
    'action.share': 'Share scenario',
    'action.reset': 'Reset draft',
    'action.copy': 'Copy result',
    'action.downloadCsv': 'Download CSV',
    'action.import': 'Import CSV',
    'action.compare': 'Compare scenarios',
    'action.library': 'Scenario library',
    'locale.label': 'Language',
  },
};

export function translate(locale, key) {
  const normalized = SUPPORTED_LOCALES.includes(locale) ? locale : 'ru';
  return translations[normalized][key] ?? translations.ru[key] ?? key;
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
