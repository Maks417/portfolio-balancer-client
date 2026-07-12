import { formatSignedAmount } from './portfolioFormUtils';

function formatBreakdownRows(title, rows) {
  if (!rows?.length) {
    return [];
  }
  return rows.flatMap((row, index) => [
    `${title} позиция ${index + 1}`,
    formatSignedAmount(row.amount, row.currency, row.isSell),
  ]);
}

export function buildResultText(result) {
  const lines = ['Результат балансировки портфеля', ''];

  if (result.stocksAmount != null) {
    lines.push(
      `Акции: ${formatSignedAmount(result.stocksAmount, result.currency, result.stocksAmount < 0)}`,
    );
  }
  if (result.bondsAmount != null) {
    lines.push(
      `Облигации: ${formatSignedAmount(result.bondsAmount, result.currency, result.bondsAmount < 0)}`,
    );
  }
  if (result.cashAmount != null) {
    lines.push(
      `Наличные: ${formatSignedAmount(result.cashAmount, result.currency, result.cashAmount < 0)}`,
    );
  }

  if (result.stocksBreakdown?.length) {
    lines.push('', 'Акции по позициям:');
    result.stocksBreakdown.forEach((row, index) => {
      lines.push(
        `  Позиция ${index + 1}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
      );
    });
  }

  if (result.bondsBreakdown?.length) {
    lines.push('', 'Облигации по позициям:');
    result.bondsBreakdown.forEach((row, index) => {
      lines.push(
        `  Позиция ${index + 1}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
      );
    });
  }

  if (result.cashBreakdown?.length) {
    lines.push('', 'Наличные по позициям:');
    result.cashBreakdown.forEach((row, index) => {
      lines.push(
        `  Позиция ${index + 1}: ${formatSignedAmount(row.amount, row.currency, row.isSell)}`,
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

export function buildResultCsv(result) {
  const rows = [['Класс', 'Позиция', 'Сумма', 'Валюта', 'Операция']];

  const addClassRow = (className, amount, currency) => {
    if (amount == null) {
      return;
    }
    const operation = amount < 0 ? 'продажа' : 'покупка';
    rows.push([className, 'Итого', Math.abs(amount).toFixed(2), currency, operation]);
  };

  addClassRow('Акции', result.stocksAmount, result.currency);
  addClassRow('Облигации', result.bondsAmount, result.currency);
  addClassRow('Наличные', result.cashAmount, result.currency);

  const addBreakdown = (className, breakdown) => {
    breakdown?.forEach((row, index) => {
      rows.push([
        className,
        `Позиция ${index + 1}`,
        Math.abs(row.amount).toFixed(2),
        row.currency,
        row.isSell || row.amount < 0 ? 'продажа' : 'покупка',
      ]);
    });
  };

  addBreakdown('Акции', result.stocksBreakdown);
  addBreakdown('Облигации', result.bondsBreakdown);
  addBreakdown('Наличные', result.cashBreakdown);

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
