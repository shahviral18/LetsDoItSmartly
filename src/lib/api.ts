const BASE_URL = 'https://mails.letsdoitsmartly.com/api';

function getToken(): string | null {
  return localStorage.getItem('ldis_token');
}

export function setToken(token: string) {
  localStorage.setItem('ldis_token', token);
}

export function clearToken() {
  localStorage.removeItem('ldis_token');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data as T;
}

export const api = {
  get:   <T>(path: string)                          => request<T>(path, { method: 'GET' }),
  post:  <T>(path: string, body?: unknown)          => request<T>(path, { method: 'POST',  body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown)          => request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};
