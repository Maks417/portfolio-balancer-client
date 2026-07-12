import axios from 'axios';
import { parseApiFieldErrors } from '../utils/portfolioFormUtils';

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

const ERROR_MESSAGES = {
  [ERROR_CODES.ratesUnavailable]:
    'Курсы валют временно недоступны. Попробуйте позже.',
  [ERROR_CODES.timeout]:
    'Сервер не ответил вовремя. Проверьте соединение и попробуйте снова.',
  [ERROR_CODES.config]:
    'Не настроен адрес API. Укажите VITE_API_BASE_URL при сборке приложения.',
  [ERROR_CODES.network]:
    'Не удалось связаться с сервером. Попробуйте позже.',
};

export function getApiBaseUrl() {
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  if (!baseUrl || baseUrl === 'undefined') {
    return null;
  }
  return baseUrl.replace(/\/$/, '');
}

export function mapApiError(error) {
  if (!getApiBaseUrl()) {
    return {
      code: ERROR_CODES.config,
      summary: ERROR_MESSAGES[ERROR_CODES.config],
      fieldErrors: {},
    };
  }

  if (error.code === 'ECONNABORTED') {
    return {
      code: ERROR_CODES.timeout,
      summary: ERROR_MESSAGES[ERROR_CODES.timeout],
      fieldErrors: {},
    };
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (status === 400) {
    const { fieldErrors, summary } = parseApiFieldErrors(data);
    return {
      code: ERROR_CODES.validation,
      summary,
      fieldErrors,
    };
  }

  if (status === 503) {
    return {
      code: ERROR_CODES.ratesUnavailable,
      summary: data?.detail || data?.title || ERROR_MESSAGES[ERROR_CODES.ratesUnavailable],
      fieldErrors: {},
    };
  }

  return {
    code: ERROR_CODES.network,
    summary: ERROR_MESSAGES[ERROR_CODES.network],
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

export async function fetchRates() {
  const client = createClient();
  if (!client) {
    throw Object.assign(new Error(ERROR_MESSAGES[ERROR_CODES.config]), {
      code: ERROR_CODES.config,
    });
  }

  try {
    const response = await client.get('/portfolio/rates');
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export async function calculatePortfolio(payload) {
  const client = createClient();
  if (!client) {
    throw Object.assign(new Error(ERROR_MESSAGES[ERROR_CODES.config]), {
      code: ERROR_CODES.config,
    });
  }

  try {
    const response = await client.post('/portfolio/calculate', payload);
    return response.data;
  } catch (error) {
    throw mapApiError(error);
  }
}

export { parseApiFieldErrors };
