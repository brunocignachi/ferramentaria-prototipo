const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const STORAGE_KEY = 'ferramentaria_auth';

function getStoredToken() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

/**
 * Wrapper fino sobre fetch para falar com a API REST do backend
 * (ferramentaria-backend). Já injeta o token JWT salvo (login/AuthContext)
 * e normaliza erros no formato { erro: '...' } devolvido pelo errorHandler.
 */
export async function apiRequest(path, { method = 'GET', body, token } = {}) {
  const authToken = token !== undefined ? token : getStoredToken();

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data = null;
  if (res.status !== 204) {
    const isJson = res.headers.get('content-type')?.includes('application/json');
    data = isJson ? await res.json().catch(() => null) : null;
  }

  if (!res.ok) {
    throw new Error(data?.erro || `Erro ${res.status} ao comunicar com a API.`);
  }

  return data;
}

export { STORAGE_KEY };
