import { parseBrokerCsv } from './brokerCsvParsers';

const CLASS_ALIASES = {
  stock: 'stocks',
  stocks: 'stocks',
  акции: 'stocks',
  акция: 'stocks',
  bond: 'bonds',
  bonds: 'bonds',
  облигации: 'bonds',
  облигация: 'bonds',
  cash: 'cash',
  наличные: 'cash',
  деньги: 'cash',
  рубли: 'cash',
};

const CURRENCY_ALIASES = {
  rub: 'rub',
  rur: 'rub',
  руб: 'rub',
  рубль: 'rub',
  usd: 'usd',
  'us$': 'usd',
  dollar: 'usd',
  eur: 'eur',
  euro: 'eur',
};

function normalizeClass(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return CLASS_ALIASES[key] ?? null;
}

function normalizeCurrency(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return CURRENCY_ALIASES[key] ?? (key.length === 3 ? key : 'rub');
}

function parseDelimitedLine(line, delimiter) {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

function detectDelimiter(headerLine) {
  if (headerLine.includes(';')) {
    return ';';
  }
  if (headerLine.includes('\t')) {
    return '\t';
  }
  return ',';
}

function emptyAssets() {
  return {
    stocksValues: [],
    bondsValues: [],
    cashValues: [],
  };
}

function pushPosition(assets, assetClass, value, currency) {
  const row = { value: String(value), currency };
  if (assetClass === 'stocks') {
    assets.stocksValues.push(row);
  } else if (assetClass === 'bonds') {
    assets.bondsValues.push(row);
  } else if (assetClass === 'cash') {
    assets.cashValues.push(row);
  }
}

export function parsePositionsCsv(text) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { ok: false, error: 'Файл пуст.' };
  }

  const delimiter = detectDelimiter(lines[0]);
  const header = parseDelimitedLine(lines[0], delimiter).map((cell) => cell.toLowerCase());
  const hasStandardHeader = header.some((cell) =>
    ['class', 'type', 'класс', 'тип', 'asset', 'актив'].includes(cell),
  );

  if (hasStandardHeader) {
    return parseStandardCsv(lines, delimiter, header);
  }

  const brokerResult = parseBrokerCsv(text);
  if (brokerResult) {
    return brokerResult;
  }

  return parseStandardCsv(lines, delimiter, header);
}

function parseStandardCsv(lines, delimiter, header) {
  const hasHeader = header.some((cell) =>
    ['class', 'type', 'класс', 'тип', 'asset', 'актив'].includes(cell),
  );

  const assets = emptyAssets();
  const dataLines = hasHeader ? lines.slice(1) : lines;

  for (const line of dataLines) {
    const cells = parseDelimitedLine(line, delimiter);
    if (cells.length < 2) {
      continue;
    }

    let assetClass;
    let value;
    let currency = 'rub';

    if (hasHeader && cells.length >= 3) {
      const classIndex = header.findIndex((h) =>
        ['class', 'type', 'класс', 'тип', 'asset', 'актив'].includes(h),
      );
      const valueIndex = header.findIndex((h) =>
        ['value', 'amount', 'сумма', 'стоимость', 'quantity'].includes(h),
      );
      const currencyIndex = header.findIndex((h) =>
        ['currency', 'валюта', 'curr'].includes(h),
      );

      assetClass = normalizeClass(cells[classIndex >= 0 ? classIndex : 0]);
      value = cells[valueIndex >= 0 ? valueIndex : 1];
      currency = normalizeCurrency(cells[currencyIndex >= 0 ? currencyIndex : 2] ?? 'rub');
    } else if (cells.length >= 3) {
      assetClass = normalizeClass(cells[0]);
      value = cells[1];
      currency = normalizeCurrency(cells[2]);
    } else {
      value = cells[0];
      currency = normalizeCurrency(cells[1]);
      assetClass = 'stocks';
    }

    const numericValue = parseFloat(String(value).replace(/\s/g, '').replace(',', '.'));
    if (!assetClass || !Number.isFinite(numericValue) || numericValue <= 0) {
      continue;
    }

    pushPosition(assets, assetClass, numericValue, currency);
  }

  const total =
    assets.stocksValues.length + assets.bondsValues.length + assets.cashValues.length;
  if (total === 0) {
    return {
      ok: false,
      error:
        'Не удалось распознать позиции. Используйте столбцы: класс, сумма, валюта (акции/облигации/наличные).',
    };
  }

  return { ok: true, assets };
}
