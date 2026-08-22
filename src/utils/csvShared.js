export function detectDelimiter(headerLine) {
  if (headerLine.includes(';')) {
    return ';';
  }
  if (headerLine.includes('\t')) {
    return '\t';
  }
  return ',';
}

export function parseDelimitedLine(line, delimiter = ';') {
  return line.split(delimiter).map((cell) => cell.trim().replace(/^"|"$/g, ''));
}

const CURRENCY_ALIASES = {
  rub: 'rub',
  rur: 'rub',
  руб: 'rub',
  рубль: 'rub',
  usd: 'usd',
  'us$': 'usd',
  $: 'usd',
  dollar: 'usd',
  eur: 'eur',
  '€': 'eur',
  euro: 'eur',
};

export function normalizeCurrency(value) {
  const key = String(value ?? '').trim().toLowerCase();
  if (CURRENCY_ALIASES[key]) {
    return CURRENCY_ALIASES[key];
  }
  return key.length === 3 ? key : 'rub';
}

export function parseAmount(value) {
  return parseFloat(String(value ?? '').replace(/\s/g, '').replace(',', '.'));
}
