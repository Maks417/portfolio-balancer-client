import axios from 'axios';
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

  if (error.code === 'ECONNABORTED') {
    return {
      code: ERROR_CODES.timeout,
      summary: errorMessage(ERROR_CODES.timeout, locale),
      fieldErrors: {},
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

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

function createClient() {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return null;
  }

  return axios.create({
    baseURL: baseUrl,
    timeout: REQUEST_TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function fetchRates(locale = 'ru') {
  const client = createClient();
  if (!client) {
    throw Object.assign(new Error(errorMessage(ERROR_CODES.config, locale)), {
      code: ERROR_CODES.config,
    });
  }

  try {
    const response = await client.get('/portfolio/rates');
    return response.data;
  } catch (error) {
    throw mapApiError(error, locale);
  }
}

export async function calculatePortfolio(payload, locale = 'ru') {
  const client = createClient();
  if (!client) {
    throw Object.assign(new Error(errorMessage(ERROR_CODES.config, locale)), {
      code: ERROR_CODES.config,
    });
  }

  try {
    const response = await client.post('/portfolio/calculate', payload);
    return response.data;
  } catch (error) {
    throw mapApiError(error, locale);
  }
}

export { parseApiFieldErrors };
