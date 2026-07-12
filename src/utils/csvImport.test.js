import { describe, expect, it } from 'vitest';
import { parsePositionsCsv } from './csvImport';
import { buildResultCsv, buildResultText } from './resultExport';
import { computeGlidePathRatio } from './glidePath';
import { parseTinkoffCsv } from './brokerCsvParsers';

describe('parsePositionsCsv', () => {
  it('parses generic csv with headers', () => {
    const result = parsePositionsCsv(
      'class,value,currency\nstocks,100000,rub\nbonds,50000,rub',
    );
    expect(result.ok).toBe(true);
    expect(result.assets.stocksValues).toHaveLength(1);
    expect(result.assets.bondsValues).toHaveLength(1);
  });
});

describe('parseTinkoffCsv', () => {
  it('parses tinkoff export headers', () => {
    const csv = [
      'Тип;Текущая стоимость;Валюта',
      'Акция;100000;RUB',
      'Облигация;50000;RUB',
    ].join('\n');
    const result = parseTinkoffCsv(csv);
    expect(result?.assets.stocksValues).toHaveLength(1);
    expect(result?.assets.bondsValues).toHaveLength(1);
  });
});

describe('resultExport', () => {
  it('builds text and csv output', () => {
    const result = {
      currency: 'rub',
      stocksAmount: 100,
      bondsAmount: 50,
      stocksBreakdown: [{ amount: 100, currency: 'rub', isSell: false }],
      fxDisclaimer: 'test',
    };
    expect(buildResultText(result)).toContain('Акции');
    expect(buildResultCsv(result)).toContain('Акции');
  });
});

describe('computeGlidePathRatio', () => {
  it('returns a valid ratio for age based glide path', () => {
    const result = computeGlidePathRatio({ currentAge: 35, retirementAge: 65 });
    expect(result?.ratioText).toMatch(/^\d+\/\d+$|^100$|^0$/);
  });
});
