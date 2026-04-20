const fallbackBaseUrl = 'http://localhost:8000';

const configuredBaseUrl = typeof import.meta.env.VITE_API_BASE_URL === 'string' ? import.meta.env.VITE_API_BASE_URL : fallbackBaseUrl;
export const API_BASE_URL = configuredBaseUrl.replace(/\/+$/, '');
export const REQUEST_TIMEOUT_MS = 30_000;
