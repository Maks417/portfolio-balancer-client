const STORAGE_KEY = 'portfolio-balancer:draft:v1';
const SCENARIO_PARAM = 'scenario';
const SCENARIO_VERSION = 1;

export function buildScenarioState({
  ratio,
  assets,
  contributionAmount,
  calculationMode,
}) {
  return {
    version: SCENARIO_VERSION,
    ratio,
    assets,
    contributionAmount,
    calculationMode,
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

export function writeScenarioToUrl(state) {
  const params = new URLSearchParams(window.location.search);
  params.set(SCENARIO_PARAM, encodeScenarioState(state));
  const nextUrl = `${window.location.pathname}?${params.toString()}`;
  window.history.replaceState({}, '', nextUrl);
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
