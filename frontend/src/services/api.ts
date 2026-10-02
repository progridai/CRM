import axios from 'axios';

type TokenProvider = (() => Promise<string | undefined>) | null;
let _tokenProvider: TokenProvider = null;

export function setTokenProvider(provider: TokenProvider): void {
  _tokenProvider = provider;
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  if (_tokenProvider) {
    const token = await _tokenProvider();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});
