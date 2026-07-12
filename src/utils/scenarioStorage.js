import { translate } from '../i18n/translations';

const STORAGE_KEY = 'portfolio-balancer:draft:v1';
const LIBRARY_KEY = 'portfolio-balancer:library:v1';
const SCENARIO_PARAM = 'scenario';
const SCENARIO_VERSION = 1;

export function buildScenarioState({
  ratio,
  assets,
  contributionAmount,
  calculationMode,
  driftThreshold,
  minTradeAmount,
}) {
  return {
    version: SCENARIO_VERSION,
    ratio,
    assets,
    contributionAmount,
    calculationMode,
    driftThreshold,
    minTradeAmount,
  };
}

export function encodeScenarioState(state) {
  const json = JSON.stringify(state);
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeScenarioState(encoded) {
  if (!encoded) {
    return null;
  }

  try {
    const json = decodeURIComponent(escape(atob(encoded)));
    const parsed = JSON.parse(json);
    if (parsed?.version !== SCENARIO_VERSION) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function readScenarioFromUrl(search = window.location.search) {
  const params = new URLSearchParams(search);
  return decodeScenarioState(params.get(SCENARIO_PARAM));
}

export function clearScenarioFromUrl() {
  const params = new URLSearchParams(window.location.search);
  if (!params.has(SCENARIO_PARAM)) {
    return;
  }
  params.delete(SCENARIO_PARAM);
  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;
  window.history.replaceState({}, '', nextUrl);
}

export function saveDraftState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota or privacy-mode errors.
  }
}

export function loadDraftState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return parsed?.version === SCENARIO_VERSION ? parsed : null;
  } catch {
    return null;
  }
}

export function clearDraftState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getShareableUrl(state) {
  const params = new URLSearchParams();
  params.set(SCENARIO_PARAM, encodeScenarioState(state));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

function readLibrary() {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLibrary(entries) {
  try {
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(entries));
  } catch {
    // Ignore storage errors.
  }
}

export function listNamedScenarios() {
  return readLibrary();
}

export function saveNamedScenario(name, state, locale = 'ru') {
  const entries = readLibrary();
  const id = crypto.randomUUID?.() ?? `scenario-${Date.now()}`;
  const entry = {
    id,
    name:
      name.trim() ||
      translate(locale, 'library.defaultName', { number: entries.length + 1 }),
    savedAt: new Date().toISOString(),
    state,
  };
  writeLibrary([entry, ...entries].slice(0, 20));
  return entry;
}

export function deleteNamedScenario(id) {
  writeLibrary(readLibrary().filter((entry) => entry.id !== id));
}

export function loadNamedScenario(id) {
  return readLibrary().find((entry) => entry.id === id)?.state ?? null;
}

export function decodeScenarioFromParam(encoded) {
  return decodeScenarioState(encoded);
}
