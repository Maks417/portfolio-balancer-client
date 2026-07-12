import { describe, expect, it } from 'vitest';
import { translate } from './translations';
import { parsePositionsCsv } from '../utils/csvImport';
import { buildResultCsv, buildResultText } from '../utils/resultExport';

describe('English localization', () => {
  it('translates messages with interpolated values', () => {
    expect(translate('en', 'allocation.drift', { value: 12 })).toBe('Drift 12%');
  });

  it('localizes CSV import errors', () => {
    expect(parsePositionsCsv('', 'en').error).toBe('The file is empty.');
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
