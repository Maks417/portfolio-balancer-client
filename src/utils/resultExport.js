import { formatSignedAmount } from './portfolioFormUtils';
import { translate } from '../i18n/translations';

export function buildResultText(result, locale = 'ru') {
  const t = (key, params) => translate(locale, key, params);
  const lines = [t('export.title'), ''];

  if (result.stocksAmount != null) {
    lines.push(
      `${t('asset.stocks')}: ${formatSignedAmount(result.stocksAmount, result.currency, result.stocksAmount < 0)}`,
    );
  }
  if (result.bondsAmount != null) {
    lines.push(
      `${t('asset.bonds')}: ${formatSignedAmount(result.bondsAmount, result.currency, result.bondsAmount < 0)}`,
    );
  }
  if (result.cashAmount != null) {
    lines.push(
      `${t('asset.cash')}: ${formatSignedAmount(result.cashAmount, result.currency, result.cashAmount < 0)}`,
    );
  }

  if (result.stocksBreakdown?.length) {
    lines.push('', t('export.stocksBreakdown'));
    result.stocksBreakdown.forEach((row, index) => {
      lines.push(
        `  ${t('asset.position', { number: index + 1 })}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
      );
    });
  }

  if (result.bondsBreakdown?.length) {
    lines.push('', t('export.bondsBreakdown'));
    result.bondsBreakdown.forEach((row, index) => {
      lines.push(
        `  ${t('asset.position', { number: index + 1 })}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
      );
    });
  }

  if (result.cashBreakdown?.length) {
    lines.push('', t('export.cashBreakdown'));
    result.cashBreakdown.forEach((row, index) => {
      lines.push(
        `  ${t('asset.position', { number: index + 1 })}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
      );
    });
  }

  if (result.contributionOnlyNote) {
    lines.push('', result.contributionOnlyNote);
  }
  if (result.toleranceNote) {
    lines.push('', result.toleranceNote);
  }
  if (result.fxDisclaimer) {
    lines.push('', result.fxDisclaimer);
  }

  return lines.join('\n');
}

export function buildResultCsv(result, locale = 'ru') {
  const t = (key, params) => translate(locale, key, params);
  const rows = [[
    t('export.csvClass'),
    t('export.csvPosition'),
    t('export.csvAmount'),
    t('export.csvCurrency'),
    t('export.csvOperation'),
  ]];

  const addClassRow = (className, amount, currency) => {
    if (amount == null) {
      return;
    }
    const operation = amount < 0 ? t('export.sell') : t('export.buy');
    rows.push([className, t('export.total'), Math.abs(amount).toFixed(2), currency, operation]);
  };

  addClassRow(t('asset.stocks'), result.stocksAmount, result.currency);
  addClassRow(t('asset.bonds'), result.bondsAmount, result.currency);
  addClassRow(t('asset.cash'), result.cashAmount, result.currency);

  const addBreakdown = (className, breakdown) => {
    breakdown?.forEach((row, index) => {
      rows.push([
        className,
        t('asset.position', { number: index + 1 }),
        Math.abs(row.amount).toFixed(2),
        row.currency,
        row.isSell || row.amount < 0 ? t('export.sell') : t('export.buy'),
      ]);
    });
  };

  addBreakdown(t('asset.stocks'), result.stocksBreakdown);
  addBreakdown(t('asset.bonds'), result.bondsBreakdown);
  addBreakdown(t('asset.cash'), result.cashBreakdown);

  return rows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function downloadCsv(csv, filename = 'portfolio-rebalance.csv') {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function copyTextToClipboard(text) {
  await navigator.clipboard.writeText(text);
}
