import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildCalculatePayload } from '../utils/portfolioFormUtils';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const requestFixture = JSON.parse(
  readFileSync(join(rootDir, 'contracts', 'calculate-request.golden.json'), 'utf8'),
);
const responseFixture = JSON.parse(
  readFileSync(join(rootDir, 'contracts', 'calculate-response.golden.json'), 'utf8'),
);

describe('API contract fixtures', () => {
  it('request fixture matches frontend payload shape', () => {
    const payload = buildCalculatePayload({
      ratio: { text: requestFixture.ratio },
      assets: {
        stocksValues: requestFixture.stockValues,
        bondsValues: requestFixture.bondValues,
      },
      contributionAmount: requestFixture.contributionAmount,
      calculationMode: requestFixture.mode,
    });

    expect(payload.ratio).toBe('50/50');
    expect(payload.stockValues).toEqual(requestFixture.stockValues);
    expect(payload.mode).toBe('contribution');
  });

  it('response fixture defines expected aggregate fields', () => {
    expect(responseFixture.stocksDiff + responseFixture.bondsDiff).toBe(100);
    expect(responseFixture.currency).toBe('rub');
  });
});
