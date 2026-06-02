export const currencyOptions = [
  { value: 'rub', text: '₽', locale: 'ru-RU' },
  { value: 'usd', text: '$', locale: 'en-US' },
  { value: 'eur', text: '€', locale: 'de-DE' },
];

const FIELD_LABELS = {
  ratio: 'Пропорция портфеля',
  stockValues: 'Позиции в акциях',
  stocksValues: 'Позиции в акциях',
  bondValues: 'Позиции в облигациях',
  bondsValues: 'Позиции в облигациях',
  contributionAmount: 'Сумма взноса',
};

const FIELD_KEYS = {
  ratio: 'ratio',
  stockValues: 'stocks',
  stocksValues: 'stocks',
  bondValues: 'bonds',
  bondsValues: 'bonds',
  contributionAmount: 'contribution',
};

export function getCurrencySign(currencyCode) {
  return currencyOptions.find((c) => c.value === currencyCode)?.text ?? '';
}

export function validateRatioText(text) {
  if (text === '100' || text === '0') {
    return 'is-valid';
  }

  if (text.length > 3 && text.length < 6) {
    const parts = text.split('/');
    const sum = parts.reduce((prev, curr) => (Number(prev) || 0) + (Number(curr) || 0), 0);
    return parts.length === 2 && sum === 100 ? 'is-valid' : 'is-invalid';
  }

  return 'is-invalid';
}

export function getRatioParts(text) {
  if (text === '100') {
    return { stocks: 100, bonds: 0 };
  }
  if (text === '0') {
    return { stocks: 0, bonds: 100 };
  }

  const parts = text.split('/');
  if (parts.length === 2) {
    const stocks = Number(parts[0]) || 0;
    const bonds = Number(parts[1]) || 0;
    return { stocks, bonds };
  }

  return { stocks: 50, bonds: 50 };
}

export function ratioTextFromSlider(stocksPercent) {
  const bondsPart = 100 - stocksPercent;
  if (bondsPart === 0) {
    return '100';
  }
  if (bondsPart === 100) {
    return '0';
  }
  return `${stocksPercent}/${bondsPart}`;
}

export function normalizeDiffAmount(value) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  if (Array.isArray(value)) {
    const total = value.reduce((sum, item) => {
      const part = normalizeDiffAmount(item);
      return part != null ? sum + part : sum;
    }, 0);
    return total > 0 || value.length === 0 ? total : null;
  }

  if (typeof value === 'object') {
    if ('amount' in value) {
      return normalizeDiffAmount(value.amount);
    }
    if ('value' in value) {
      return normalizeDiffAmount(value.value);
    }
    const amounts = Object.values(value)
      .map(normalizeDiffAmount)
      .filter((v) => v != null);
    if (amounts.length === 0) {
      return null;
    }
    return amounts.reduce((a, b) => a + b, 0);
  }

  return null;
}

export function formatAmount(amount, currencyCode) {
  const option = currencyOptions.find((c) => c.value === currencyCode);
  const locale = option?.locale ?? 'ru-RU';
  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount);
  const sign = getCurrencySign(currencyCode);
  return `${sign}${formatted}`;
}

export function hasFilledPosition(rows) {
  return rows.some((row) => String(row.value).trim() !== '' && Number(row.value) > 0);
}

export function hasMixedCurrencies(stocksValues, bondsValues, contributionCurrency) {
  const currencies = new Set(
    [...stocksValues, ...bondsValues]
      .map((row) => row.currency)
      .filter(Boolean),
  );
  if (contributionCurrency) {
    currencies.add(contributionCurrency);
  }
  return currencies.size > 1;
}

function normalizeErrorMessages(value) {
  if (Array.isArray(value)) {
    return value.map(String).join(' ');
  }
  return String(value);
}

export function parseApiFieldErrors(errorData) {
  const fieldErrors = {};
  const messages = [];

  if (!errorData) {
    return { fieldErrors, summary: '' };
  }

  const errors = errorData.errors ?? errorData;

  if (Array.isArray(errors)) {
    errors.forEach((item) => {
      const field = item.field ?? item.key;
      const message = item.message ?? item.error ?? String(item);
      if (field && FIELD_KEYS[field]) {
        fieldErrors[FIELD_KEYS[field]] = normalizeErrorMessages(message);
      } else {
        messages.push(normalizeErrorMessages(message));
      }
    });
  } else if (typeof errors === 'object') {
    Object.entries(errors).forEach(([field, message]) => {
      const mapped = FIELD_KEYS[field];
      if (mapped) {
        fieldErrors[mapped] = normalizeErrorMessages(message);
      } else {
        const label = FIELD_LABELS[field] ?? field;
        messages.push(`${label}: ${normalizeErrorMessages(message)}`);
      }
    });
  } else {
    messages.push(String(errors));
  }

  const summary =
    messages.length > 0
      ? messages.join(' ')
      : Object.keys(fieldErrors).length > 0
        ? 'Проверьте выделенные поля.'
        : 'Не удалось выполнить расчёт. Проверьте введённые данные.';

  return { fieldErrors, summary };
}
