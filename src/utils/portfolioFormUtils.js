export const currencyOptions = [
  { value: 'rub', text: '₽', locale: 'ru-RU' },
  { value: 'usd', text: '$', locale: 'en-US' },
  { value: 'eur', text: '€', locale: 'de-DE' },
];

export const ALLOCATION_PRESETS = [
  { label: '50/50', ratio: '50/50', slider: 50 },
  { label: '60/40', ratio: '60/40', slider: 60 },
  { label: '70/30', ratio: '70/30', slider: 70 },
  { label: '80/20', ratio: '80/20', slider: 80 },
  { label: '100 (акции)', ratio: '100', slider: 100 },
  { label: '0 (облигации)', ratio: '0', slider: 0 },
  { label: '60/30/10', ratio: '60/30/10', slider: 60, threeWay: true },
];

export const DEFAULT_FX_RATES = { rub: 1, usd: 90, eur: 100 };

let activeFxRates = { ...DEFAULT_FX_RATES };
let activeFxMeta = null;

export const BREAKDOWN_ESTIMATE_NOTE =
  'Распределение по позициям рассчитано на сервере по текущим курсам.';

export function setFxRates(ratesPerUnitInRub, metadata = null) {
  if (!ratesPerUnitInRub) {
    activeFxRates = { ...DEFAULT_FX_RATES };
    activeFxMeta = null;
    return;
  }

  activeFxRates = {
    rub: 1,
    usd: ratesPerUnitInRub.usd ?? DEFAULT_FX_RATES.usd,
    eur: ratesPerUnitInRub.eur ?? DEFAULT_FX_RATES.eur,
  };
  activeFxMeta = metadata;
}

export function getFxRates() {
  return { ...activeFxRates };
}

export function getFxMeta() {
  return activeFxMeta;
}

export function formatFxDisclaimer(fxMeta = activeFxMeta) {
  if (!fxMeta) {
    return 'Курсы валют ориентировочные и используются для предпросмотра до загрузки актуальных данных.';
  }

  const asOf = fxMeta.ratesAsOf
    ? new Date(fxMeta.ratesAsOf).toLocaleDateString('ru-RU')
    : 'неизвестно';
  const staleSuffix = fxMeta.stale ? ' (устаревшие)' : '';
  const cacheSuffix = fxMeta.fromCache ? ', из кэша' : '';
  const usd = fxMeta.ratesPerUnitInRub?.usd ?? activeFxRates.usd;
  const eur = fxMeta.ratesPerUnitInRub?.eur ?? activeFxRates.eur;

  return `Курсы ${fxMeta.source} на ${asOf}${cacheSuffix}${staleSuffix}: 1$ ≈ ${formatAmount(usd, 'rub')}, 1€ ≈ ${formatAmount(eur, 'rub')}.`;
}

const FIELD_LABELS = {
  ratio: 'Пропорция портфеля',
  stockValues: 'Позиции в акциях',
  stocksValues: 'Позиции в акциях',
  bondValues: 'Позиции в облигациях',
  bondsValues: 'Позиции в облигациях',
  cashValues: 'Наличные',
  contributionAmount: 'Сумма взноса',
  mode: 'Режим расчёта',
  driftThreshold: 'Допуск отклонения',
  minTradeAmount: 'Минимальная сделка',
};

const FIELD_KEYS = {
  ratio: 'ratio',
  stockValues: 'stocks',
  stocksValues: 'stocks',
  bondValues: 'bonds',
  bondsValues: 'bonds',
  cashValues: 'cash',
  contributionAmount: 'contribution',
  mode: 'mode',
  driftThreshold: 'driftThreshold',
  minTradeAmount: 'minTradeAmount',
};

function mapFieldKey(field) {
  if (FIELD_KEYS[field]) {
    return FIELD_KEYS[field];
  }

  const normalized = field.toLowerCase();
  if (normalized.startsWith('contributionamount')) {
    return 'contribution';
  }
  if (normalized.startsWith('stockvalues')) {
    return 'stocks';
  }
  if (normalized.startsWith('bondvalues')) {
    return 'bonds';
  }
  if (normalized.startsWith('cashvalues')) {
    return 'cash';
  }
  if (normalized.startsWith('driftthreshold')) {
    return 'driftThreshold';
  }
  if (normalized.startsWith('mintradeamount')) {
    return 'minTradeAmount';
  }
  if (normalized.startsWith('ratio')) {
    return 'ratio';
  }
  if (normalized.startsWith('mode')) {
    return 'mode';
  }

  return null;
}

export function getCurrencySign(currencyCode) {
  return currencyOptions.find((c) => c.value === currencyCode)?.text ?? '';
}

export function validateRatioText(text) {
  if (text === '100' || text === '0') {
    return 'is-valid';
  }

  if (!text.includes('/')) {
    return 'is-invalid';
  }

  const parts = text.split('/');
  if (parts.length !== 2 && parts.length !== 3) {
    return 'is-invalid';
  }

  const sum = parts.reduce((prev, curr) => (Number(prev) || 0) + (Number(curr) || 0), 0);
  return sum === 100 ? 'is-valid' : 'is-invalid';
}

export function getRatioParts(text) {
  if (text === '100') {
    return { stocks: 100, bonds: 0, cash: 0 };
  }
  if (text === '0') {
    return { stocks: 0, bonds: 100, cash: 0 };
  }

  const parts = text.split('/');
  if (parts.length === 3) {
    const stocks = Number(parts[0]) || 0;
    const bonds = Number(parts[1]) || 0;
    const cash = Number(parts[2]) || 0;
    return { stocks, bonds, cash };
  }

  if (parts.length === 2) {
    const stocks = Number(parts[0]) || 0;
    const bonds = Number(parts[1]) || 0;
    return { stocks, bonds, cash: 0 };
  }

  return { stocks: 50, bonds: 50, cash: 0 };
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
  }).format(Math.abs(amount));
  const sign = getCurrencySign(currencyCode);
  return `${sign}${formatted}`;
}

export function formatSignedAmount(amount, currencyCode, isSell = false) {
  const prefix = amount < 0 || isSell ? '−' : '+';
  return `${prefix}${formatAmount(Math.abs(amount), currencyCode)}`;
}

export function hasFilledPosition(rows) {
  return rows.some((row) => parsePositiveNumber(row.value) > 0);
}

export function parsePositiveNumber(value) {
  const n = parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function toBase(value, currency, rates = activeFxRates) {
  return parsePositiveNumber(value) * (rates[currency] ?? 1);
}

export function fromBase(baseValue, currency, rates = activeFxRates) {
  return baseValue / (rates[currency] ?? 1);
}

export function sumPositionsInBase(rows, rates = activeFxRates) {
  return rows.reduce((total, row) => total + toBase(row.value, row.currency, rates), 0);
}

export function getCurrentAllocation(
  stocksValues,
  bondsValues,
  cashValues = [],
  rates = activeFxRates,
) {
  const stockTotalBase = sumPositionsInBase(stocksValues, rates);
  const bondTotalBase = sumPositionsInBase(bondsValues, rates);
  const cashTotalBase = sumPositionsInBase(cashValues, rates);
  const grandTotal = stockTotalBase + bondTotalBase + cashTotalBase;
  const hasPositions = grandTotal > 0;
  const currentStockPct = hasPositions
    ? Math.round((stockTotalBase / grandTotal) * 100)
    : 0;
  const currentBondPct = hasPositions
    ? Math.round((bondTotalBase / grandTotal) * 100)
    : 0;
  const currentCashPct = hasPositions ? 100 - currentStockPct - currentBondPct : 0;

  return {
    stockTotalBase,
    bondTotalBase,
    cashTotalBase,
    hasPositions,
    currentStockPct,
    currentBondPct,
    currentCashPct,
    driftFrom(targetStockPct) {
      return hasPositions ? Math.abs(currentStockPct - targetStockPct) : 0;
    },
    maxDrift(targets) {
      if (!hasPositions) {
        return 0;
      }
      const drifts = [
        Math.abs(currentStockPct - (targets.stocks ?? 0)),
        Math.abs(currentBondPct - (targets.bonds ?? 0)),
      ];
      if (targets.cash > 0 || currentCashPct > 0) {
        drifts.push(Math.abs(currentCashPct - (targets.cash ?? 0)));
      }
      return Math.max(...drifts);
    },
    isDriftHigh(targetStockPct, threshold = 10) {
      return hasPositions ? Math.abs(currentStockPct - targetStockPct) >= threshold : false;
    },
  };
}

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

export function distributeBuys(rows, budgetAmount, budgetCurrency, rates = activeFxRates) {
  if (!Array.isArray(rows) || rows.length === 0 || !(budgetAmount > 0)) {
    return [];
  }
  const budgetBase = toBase(budgetAmount, budgetCurrency, rates);
  const baseValues = rows.map((row) => toBase(row.value, row.currency, rates));
  const baseBuys = waterfillEqual(baseValues, budgetBase);
  return rows.map((row, i) => ({
    currency: row.currency,
    amount: fromBase(baseBuys[i], row.currency, rates),
    isSell: false,
  }));
}

export function mapServerBreakdown(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => ({
    currency: row.currency,
    amount: normalizeDiffAmount(row.amount) ?? 0,
    isSell: Boolean(row.isSell),
  }));
}

export function hasMixedCurrencies(stocksValues, bondsValues, contributionCurrency, cashValues = []) {
  const currencies = new Set(
    [...stocksValues, ...bondsValues, ...cashValues]
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
      const mapped = field ? mapFieldKey(field) : null;
      if (mapped) {
        fieldErrors[mapped] = normalizeErrorMessages(message);
      } else {
        messages.push(normalizeErrorMessages(message));
      }
    });
  } else if (typeof errors === 'object') {
    Object.entries(errors).forEach(([field, message]) => {
      const mapped = mapFieldKey(field);
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

export function buildCalculatePayload({
  ratio,
  assets,
  contributionAmount,
  calculationMode,
  driftThreshold,
  minTradeAmount,
}) {
  const isRebalanceMode = calculationMode === 'rebalance';
  const contributionNumber = Number(contributionAmount.value);
  const contributionValue = isRebalanceMode
    ? (contributionAmount.value === '' || Number.isNaN(contributionNumber) ? 0 : contributionNumber)
    : contributionNumber;

  const payload = {
    ratio: ratio.text,
    stockValues: assets.stocksValues,
    bondValues: assets.bondsValues,
    cashValues: assets.cashValues ?? [],
    contributionAmount: {
      value: String(contributionValue),
      currency: contributionAmount.currency,
    },
    mode: calculationMode,
  };

  const drift = Number(driftThreshold);
  if (Number.isFinite(drift) && drift > 0) {
    payload.driftThreshold = drift;
  }

  const minTrade = Number(minTradeAmount);
  if (Number.isFinite(minTrade) && minTrade > 0) {
    payload.minTradeAmount = minTrade;
  }

  return payload;
}
