import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  deleteNamedScenario,
  encodeScenarioState,
  listNamedScenarios,
  saveNamedScenario,
} from './scenarioStorage';

describe('scenario library', () => {
  beforeEach(() => {
    const store = {};
    vi.stubGlobal('localStorage', {
      getItem: (key) => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      },
    });
  });
  it('saves and lists named scenarios', () => {
    const state = {
      version: 1,
      ratio: { text: '60/40', value: 60 },
      assets: { stocksValues: [], bondsValues: [], cashValues: [] },
      contributionAmount: { value: '', currency: 'rub' },
      calculationMode: 'contribution',
    };

    const entry = saveNamedScenario('Test', state);
    expect(listNamedScenarios().some((item) => item.id === entry.id)).toBe(true);
    deleteNamedScenario(entry.id);
  });

  it('round-trips encoded scenario state', () => {
    const encoded = encodeScenarioState({
      version: 1,
      ratio: { text: '50/50', value: 50 },
      calculationMode: 'contribution',
    });
    expect(encoded.length).toBeGreaterThan(0);
  });
});
