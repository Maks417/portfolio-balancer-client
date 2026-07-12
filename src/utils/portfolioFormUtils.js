export const currencyOptions = [
  { value: 'rub', text: '₽', locale: 'ru-RU' },
  { value: 'usd', text: '$', locale: 'en-US' },
  { value: 'eur', text: '€', locale: 'de-DE' },
];

// Approximate FX rates (base = RUB) used ONLY for the live preview affordances
// (current-distribution bar, per-class totals, per-position breakdown). The
// authoritative amounts always come from the backend; see FX_DISCLAIMER.
export const FX_RATES = { rub: 1, usd: 90, eur: 100 };

export const FX_DISCLAIMER =
  'Курсы валют ориентировочные (1$ ≈ 90 ₽, 1€ ≈ 100 ₽) и используются только для расчёта пропорций.';

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
  return rows.some((row) => parsePositiveNumber(row.value) > 0);
}

// Parse a user-entered amount, tolerating comma decimals and blanks; returns 0
// for anything non-positive so it can be summed safely.
export function parsePositiveNumber(value) {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toBase(value, currency) {
  return parsePositiveNumber(value) * (FX_RATES[currency] ?? 1);
}

export function fromBase(baseValue, currency) {
  return baseValue / (FX_RATES[currency] ?? 1);
}

export function sumPositionsInBase(rows) {
  return rows.reduce((total, row) => total + toBase(row.value, row.currency), 0);
}

// Current stock/bond split of the entered portfolio, in a common base currency,
// plus a helper to compute drift from a target stock percentage.
export function getCurrentAllocation(stocksValues, bondsValues) {
  const stockTotalBase = sumPositionsInBase(stocksValues);
  const bondTotalBase = sumPositionsInBase(bondsValues);
  const grandTotal = stockTotalBase + bondTotalBase;
  const hasPositions = grandTotal > 0;
  const currentStockPct = hasPositions
    ? Math.round((stockTotalBase / grandTotal) * 100)
    : 0;
  const currentBondPct = hasPositions ? 100 - currentStockPct : 0;

  return {
    stockTotalBase,
    bondTotalBase,
    hasPositions,
    currentStockPct,
    currentBondPct,
    driftFrom(targetStockPct) {
      return hasPositions ? Math.abs(currentStockPct - targetStockPct) : 0;
    },
  };
}

// Water-fill an equalizing distribution of `budget` across positions holding
// `values` (all in the same base currency): fill the lowest positions first so
// they converge toward a common level, then spread any leftover evenly.
export function waterfillEqual(values, budget) {
  const n = values.length;
  if (n === 0 || budget <= 0) {
    return values.map(() => 0);
  }
  const sum = values.reduce((a, b) => a + b, 0);
  const target = (sum + budget) / n;
  const need = values.map((v) => Math.max(0, target - v));
  const needSum = need.reduce((a, b) => a + b, 0);
  const leftover = budget - needSum;
  return need.map((v) => v + leftover / n);
}

// Split an aggregate buy amount (as returned by the backend, in `budgetCurrency`)
// across the given positions, returning the per-position amount converted back to
// each position's own currency. Approximate — for display only.
export function distributeBuys(rows, budgetAmount, budgetCurrency) {
  if (!Array.isArray(rows) || rows.length === 0 || !(budgetAmount > 0)) {
    return [];
  }
  const budgetBase = toBase(budgetAmount, budgetCurrency);
  const baseValues = rows.map((row) => toBase(row.value, row.currency));
  const baseBuys = waterfillEqual(baseValues, budgetBase);
  return rows.map((row, i) => ({
    currency: row.currency,
    amount: fromBase(baseBuys[i], row.currency),
  }));
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
