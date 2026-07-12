import { describe, expect, it } from 'vitest';
import {
  buildCalculatePayload,
  distributeBuys,
  getCurrentAllocation,
  mapServerBreakdown,
  normalizeDiffAmount,
  parseApiFieldErrors,
  setFxRates,
  validateRatioText,
  waterfillEqual,
} from './portfolioFormUtils';

describe('validateRatioText', () => {
  it('accepts 100, 0 and valid fractions', () => {
    expect(validateRatioText('100')).toBe('is-valid');
    expect(validateRatioText('0')).toBe('is-valid');
    expect(validateRatioText('70/30')).toBe('is-valid');
  });

  it('rejects invalid fractions', () => {
    expect(validateRatioText('70/40')).toBe('is-invalid');
    expect(validateRatioText('abc')).toBe('is-invalid');
  });
});

describe('parseApiFieldErrors', () => {
  it('maps top-level field keys', () => {
    const result = parseApiFieldErrors({
      errors: { ratio: ['Invalid ratio'] },
    });
    expect(result.fieldErrors.ratio).toBe('Invalid ratio');
  });

  it('maps nested contributionAmount.value to contribution', () => {
    const result = parseApiFieldErrors({
      errors: { 'contributionAmount.value': ['Must be positive'] },
    });
    expect(result.fieldErrors.contribution).toBe('Must be positive');
  });

  it('maps indexed stock position errors to stocks', () => {
    const result = parseApiFieldErrors({
      errors: { 'stockValues[0].currency': ['Unsupported currency'] },
    });
    expect(result.fieldErrors.stocks).toBe('Unsupported currency');
  });
});

describe('normalizeDiffAmount', () => {
  it('parses numbers, strings and arrays', () => {
    expect(normalizeDiffAmount(10)).toBe(10);
    expect(normalizeDiffAmount('12.5')).toBe(12.5);
    expect(normalizeDiffAmount([1, 2, 3])).toBe(6);
  });
});

describe('allocation and distribution', () => {
  it('computes current allocation using active FX rates', () => {
    setFxRates({ rub: 1, usd: 100, eur: 110 });
    const allocation = getCurrentAllocation(
      [{ value: '100', currency: 'usd' }],
      [{ value: '10000', currency: 'rub' }],
    );
    expect(allocation.currentStockPct).toBe(50);
  });

  it('waterfills budget across positions', () => {
    const buys = waterfillEqual([10, 30], 20);
    expect(buys.reduce((a, b) => a + b, 0)).toBe(20);
  });

  it('maps server breakdown rows', () => {
    const rows = mapServerBreakdown([
      { amount: 10, currency: 'rub', isSell: false },
      { amount: 5, currency: 'usd', isSell: true },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].isSell).toBe(true);
  });

  it('builds calculate payload with mode', () => {
    const payload = buildCalculatePayload({
      ratio: { text: '50/50' },
      assets: {
        stocksValues: [{ value: '10', currency: 'rub' }],
        bondsValues: [{ value: '10', currency: 'rub' }],
      },
      contributionAmount: { value: '100', currency: 'rub' },
      calculationMode: 'rebalance',
    });
    expect(payload.mode).toBe('rebalance');
    expect(payload.contributionAmount.value).toBe('100');
  });
});

describe('distributeBuys', () => {
  it('returns empty array for invalid budget', () => {
    expect(distributeBuys([], 0, 'rub')).toEqual([]);
  });
});
