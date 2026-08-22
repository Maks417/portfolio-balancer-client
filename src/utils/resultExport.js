import { formatSignedAmount } from './portfolioFormUtils';
import { translate } from '../i18n/translations';

const ASSET_CLASSES = [
  { key: 'stocks', amountKey: 'stocksAmount', breakdownKey: 'stocksBreakdown', exportKey: 'export.stocksBreakdown' },
  { key: 'bonds', amountKey: 'bondsAmount', breakdownKey: 'bondsBreakdown', exportKey: 'export.bondsBreakdown' },
  { key: 'cash', amountKey: 'cashAmount', breakdownKey: 'cashBreakdown', exportKey: 'export.cashBreakdown' },
];

export function buildResultText(result, locale = 'ru') {
  const t = (key, params) => translate(locale, key, params);
  const lines = [t('export.title'), ''];

  for (const asset of ASSET_CLASSES) {
    const amount = result[asset.amountKey];
    if (amount != null) {
      lines.push(
        `${t(`asset.${asset.key}`)}: ${formatSignedAmount(amount, result.currency, amount < 0)}`,
      );
    }
  }

  for (const asset of ASSET_CLASSES) {
    const breakdown = result[asset.breakdownKey];
    if (breakdown?.length) {
      lines.push('', t(asset.exportKey));
      breakdown.forEach((row, index) => {
        lines.push(
          `  ${t('asset.position', { number: index + 1 })}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
        );
      });
    }
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

  for (const asset of ASSET_CLASSES) {
    addClassRow(t(`asset.${asset.key}`), result[asset.amountKey], result.currency);
  }

  for (const asset of ASSET_CLASSES) {
    result[asset.breakdownKey]?.forEach((row, index) => {
      rows.push([
        t(`asset.${asset.key}`),
        t('asset.position', { number: index + 1 }),
        Math.abs(row.amount).toFixed(2),
        row.currency,
        row.isSell || row.amount < 0 ? t('export.sell') : t('export.buy'),
      ]);
    });
  }

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
