import { detectDelimiter, normalizeCurrency, parseAmount, parseDelimitedLine } from './csvShared';

function mapBrokerType(type) {
  const normalized = String(type ?? '').toLowerCase();
  if (normalized.includes('облига')) {
    return 'bonds';
  }
  if (normalized.includes('валют') || normalized.includes('денеж')) {
    return 'cash';
  }
  return 'stocks';
}

function buildResult(stocksValues, bondsValues, cashValues, source) {
  const total = stocksValues.length + bondsValues.length + cashValues.length;
  if (total === 0) {
    return null;
  }
  return {
    ok: true,
    assets: { stocksValues, bondsValues, cashValues },
    source,
  };
}

export function parseTinkoffCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const header = parseDelimitedLine(lines[0]).map((cell) => cell.toLowerCase());
  const typeIndex = header.findIndex((h) => h.includes('тип'));
  const valueIndex = header.findIndex(
    (h) => h.includes('текущая стоимость') || h.includes('стоимость'),
  );
  const currencyIndex = header.findIndex((h) => h.includes('валюта'));

  if (typeIndex < 0 || valueIndex < 0) {
    return null;
  }

  const stocksValues = [];
  const bondsValues = [];
  const cashValues = [];

  for (const line of lines.slice(1)) {
    const cells = parseDelimitedLine(line);
    const assetClass = mapBrokerType(cells[typeIndex]);
    const value = parseAmount(cells[valueIndex]);
    const currency = normalizeCurrency(cells[currencyIndex >= 0 ? currencyIndex : '']);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    const row = { value: String(value), currency };
    if (assetClass === 'bonds') {
      bondsValues.push(row);
    } else if (assetClass === 'cash') {
      cashValues.push(row);
    } else {
      stocksValues.push(row);
    }
  }

  return buildResult(stocksValues, bondsValues, cashValues, 'tinkoff');
}

export function parseGenericBrokerCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return null;
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = parseDelimitedLine(lines[0], delimiter).map((cell) => cell.toLowerCase());
  const nameIndex = header.findIndex((h) =>
    ['ticker', 'symbol', 'инструмент', 'название', 'name'].some((key) => h.includes(key)),
  );
  const typeIndex = header.findIndex((h) =>
    ['type', 'asset', 'класс', 'тип', 'вид'].some((key) => h.includes(key)),
  );
  const valueIndex = header.findIndex((h) =>
    ['value', 'amount', 'стоимость', 'сумма', 'market'].some((key) => h.includes(key)),
  );

  if (valueIndex < 0) {
    return null;
  }

  const stocksValues = [];
  const bondsValues = [];
  const cashValues = [];

  for (const line of lines.slice(1)) {
    const cells = parseDelimitedLine(line, delimiter);
    const rawType = typeIndex >= 0 ? cells[typeIndex] : cells[nameIndex >= 0 ? nameIndex : 0];
    const assetClass = mapBrokerType(rawType);
    const value = parseAmount(cells[valueIndex]);

    if (!Number.isFinite(value) || value <= 0) {
      continue;
    }

    const row = { value: String(value), currency: 'rub' };
    if (assetClass === 'bonds') {
      bondsValues.push(row);
    } else if (assetClass === 'cash') {
      cashValues.push(row);
    } else {
      stocksValues.push(row);
    }
  }

  return buildResult(stocksValues, bondsValues, cashValues, 'generic');
}

export function parseBrokerCsv(text) {
  return parseTinkoffCsv(text) ?? parseGenericBrokerCsv(text);
}
