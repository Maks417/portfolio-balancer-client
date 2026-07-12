import { describe, expect, it } from 'vitest';
import {
  buildScenarioState,
  decodeScenarioState,
  encodeScenarioState,
} from './scenarioStorage';

describe('scenarioStorage', () => {
  it('round-trips scenario state through encoding', () => {
    const state = buildScenarioState({
      ratio: { text: '60/40', value: 60 },
      assets: {
        stocksValues: [{ value: '100', currency: 'rub' }],
        bondsValues: [{ value: '50', currency: 'rub' }],
      },
      contributionAmount: { value: '25', currency: 'rub' },
      calculationMode: 'contribution',
    });

    const encoded = encodeScenarioState(state);
    const decoded = decodeScenarioState(encoded);

    expect(decoded.ratio.text).toBe('60/40');
    expect(decoded.calculationMode).toBe('contribution');
  });
});
