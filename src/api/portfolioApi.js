import { parseApiFieldErrors } from '../utils/portfolioFormUtils';
import { translate } from '../i18n/translations';

const REQUEST_TIMEOUT_MS = 15000;

export const CALCULATION_MODES = {
  contribution: 'contribution',
  rebalance: 'rebalance',
};

export const ERROR_CODES = {
  validation: 'validation',
  ratesUnavailable: 'rates_unavailable',
  timeout: 'timeout',
  config: 'config',
  network: 'network',
};

const ERROR_MESSAGE_KEYS = {
  [ERROR_CODES.ratesUnavailable]: 'error.ratesUnavailable',
  [ERROR_CODES.timeout]: 'error.timeout',
  [ERROR_CODES.config]: 'error.apiConfig',
  [ERROR_CODES.network]: 'error.network',
};

const errorMessage = (code, locale) => translate(locale, ERROR_MESSAGE_KEYS[code]);

export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl || baseUrl === 'undefined') {
    return null;
  }
  return baseUrl.replace(/\/$/, '');
}

export function mapApiError(error, locale = 'ru') {
  if (!getApiBaseUrl()) {
    return {
      code: ERROR_CODES.config,
      summary: errorMessage(ERROR_CODES.config, locale),
      fieldErrors: {},
    };
  }

  if (error.code === 'ECONNABORTED' || error.name === 'TimeoutError' || error.name === 'AbortError') {
    return {
      code: ERROR_CODES.timeout,
      summary: errorMessage(ERROR_CODES.timeout, locale),
      fieldErrors: {},
    };
  }

  const status = error.status ?? error.response?.status;
  const data = error.data ?? error.response?.data;

  if (status === 400) {
    const { fieldErrors, summary } = parseApiFieldErrors(data, locale);
    return {
      code: ERROR_CODES.validation,
      summary,
      fieldErrors,
    };
  }

  if (status === 503) {
    return {
      code: ERROR_CODES.ratesUnavailable,
      summary: errorMessage(ERROR_CODES.ratesUnavailable, locale),
      fieldErrors: {},
    };
  }

  return {
    code: ERROR_CODES.network,
    summary: errorMessage(ERROR_CODES.network, locale),
    fieldErrors: {},
  };
}

function createTimeoutSignal() {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  }

  const controller = new AbortController();
  setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return controller.signal;
}

async function request(path, { method = 'GET', body, locale = 'ru' } = {}) {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw Object.assign(new Error(errorMessage(ERROR_CODES.config, locale)), {
      code: ERROR_CODES.config,
    });
  }

  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: body == null ? undefined : JSON.stringify(body),
      signal: createTimeoutSignal(),
    });

    let data = null;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = text || null;
    }

    if (!response.ok) {
      throw mapApiError({ status: response.status, data }, locale);
    }

    return data;
  } catch (error) {
    if (error.code && error.summary) {
      throw error;
    }
    throw mapApiError(error, locale);
  }
}

export async function fetchRates(locale = 'ru') {
  return request('/portfolio/rates', { locale });
}

export async function calculatePortfolio(payload, locale = 'ru') {
  return request('/portfolio/calculate', {
    method: 'POST',
    body: payload,
    locale,
  });
}

export { parseApiFieldErrors };
