import { describe, expect, it } from 'vitest';
import { translate } from './translations';
import { parsePositionsCsv } from '../utils/csvImport';
import { buildResultCsv, buildResultText } from '../utils/resultExport';

describe('English localization', () => {
  it('translates messages with interpolated values', () => {
    expect(translate('en', 'allocation.drift', { value: 12 })).toBe('Drift 12%');
    expect(
      translate('en', 'allocation.aria', { stocks: 60, bonds: 30, cash: 10 }),
    ).toBe('Stocks 60%, bonds 30%, cash 10%');
    expect(
      translate('ru', 'allocation.aria', { stocks: 60, bonds: 30, cash: 10 }),
    ).toBe('Акции 60%, облигации 30%, наличные 10%');
  });

  it('localizes CSV import errors', async () => {
    expect((await parsePositionsCsv('', 'en')).error).toBe('The file is empty.');
  });

  it('localizes result text and CSV exports', () => {
    const result = {
      currency: 'rub',
      stocksAmount: 100,
      bondsAmount: -50,
      cashAmount: 0,
      stocksBreakdown: [],
      bondsBreakdown: [],
      cashBreakdown: [],
    };

    expect(buildResultText(result, 'en')).toContain('Stocks:');
    expect(buildResultCsv(result, 'en')).toContain('Class,Position,Amount,Currency,Operation');
  });
});
