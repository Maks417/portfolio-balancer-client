import { describe, expect, it } from 'vitest';
import {
  applyCashToRatioParts,
  buildCalculatePayload,
  getCurrentAllocation,
  getRatioParts,
  mapServerBreakdown,
  normalizeDiffAmount,
  parseApiFieldErrors,
  ratioTextFromSlider,
  setFxRates,
  validateRatioText,
} from './portfolioFormUtils';
import { computeGlidePathRatio, withPreservedCash } from './glidePath';

describe('validateRatioText', () => {
  it('accepts 100, 0 and valid fractions', () => {
    expect(validateRatioText('100')).toBe('is-valid');
    expect(validateRatioText('0')).toBe('is-valid');
    expect(validateRatioText('70/30')).toBe('is-valid');
    expect(validateRatioText('60/30/10')).toBe('is-valid');
  });

  it('rejects invalid fractions', () => {
    expect(validateRatioText('70/40')).toBe('is-invalid');
    expect(validateRatioText('abc')).toBe('is-invalid');
  });
});

describe('ratioTextFromSlider', () => {
  it('preserves cash when sliding stocks', () => {
    expect(ratioTextFromSlider(60, 10)).toBe('60/30/10');
    expect(ratioTextFromSlider(70, 10)).toBe('70/20/10');
    expect(ratioTextFromSlider(90, 10)).toBe('90/0/10');
  });

  it('clamps stocks to the non-cash remainder', () => {
    expect(ratioTextFromSlider(100, 10)).toBe('90/0/10');
  });

  it('keeps 2-way text when cash is zero', () => {
    expect(ratioTextFromSlider(60, 0)).toBe('60/40');
    expect(ratioTextFromSlider(100, 0)).toBe('100');
    expect(ratioTextFromSlider(0, 0)).toBe('0');
  });
});

describe('applyCashToRatioParts', () => {
  it('scales stocks/bonds into non-cash remainder', () => {
    expect(applyCashToRatioParts(60, 40, 10)).toBe('54/36/10');
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

  it('computes maxDrift with cash targets', () => {
    setFxRates({ rub: 1, usd: 1, eur: 1 });
    const allocation = getCurrentAllocation(
      [{ value: '60', currency: 'rub' }],
      [{ value: '30', currency: 'rub' }],
      [{ value: '10', currency: 'rub' }],
    );
    expect(allocation.maxDrift({ stocks: 50, bonds: 40, cash: 10 })).toBe(10);
    expect(allocation.isDriftHigh({ stocks: 60, bonds: 30, cash: 10 })).toBe(false);
    expect(allocation.isDriftHigh({ stocks: 50, bonds: 40, cash: 10 })).toBe(true);
  });

  it('maps server breakdown rows', () => {
    const rows = mapServerBreakdown([
      { amount: 10, currency: 'rub', isSell: false },
      { amount: 5, currency: 'usd', isSell: true },
    ]);
    expect(rows).toHaveLength(2);
    expect(rows[1].isSell).toBe(true);
  });

  it('builds calculate payload with mode and cashValues', () => {
    const payload = buildCalculatePayload({
      ratio: { text: '60/30/10' },
      assets: {
        stocksValues: [{ value: '10', currency: 'rub' }],
        bondsValues: [{ value: '10', currency: 'rub' }],
        cashValues: [{ value: '5', currency: 'rub' }],
      },
      contributionAmount: { value: '100', currency: 'rub' },
      calculationMode: 'rebalance',
    });
    expect(payload.mode).toBe('rebalance');
    expect(payload.contributionAmount.value).toBe('100');
    expect(payload.cashValues).toEqual([{ value: '5', currency: 'rub' }]);
    expect(payload.stockValues).toEqual([{ value: '10', currency: 'rub' }]);
    expect(payload.bondValues).toEqual([{ value: '10', currency: 'rub' }]);
  });
});

describe('glide path cash preservation', () => {
  it('preserves cash when applying glide result', () => {
    const glide = computeGlidePathRatio({ currentAge: 40, retirementAge: 65 });
    expect(glide).not.toBeNull();
    const withCash = withPreservedCash(glide, 10);
    const parts = getRatioParts(withCash.ratioText);
    expect(parts.cash).toBe(10);
    expect(parts.stocks + parts.bonds + parts.cash).toBe(100);
  });
});
