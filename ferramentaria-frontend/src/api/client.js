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

function authHeader(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function lerResposta(res) {
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
      ...authHeader(authToken),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  return lerResposta(res);
}

// Envio de arquivo: sem Content-Type, para o navegador definir o boundary do multipart.
export async function apiUpload(path, campo, arquivo) {
  const form = new FormData();
  form.append(campo, arquivo);

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeader(getStoredToken()),
    body: form,
  });

  return lerResposta(res);
}

// O download exige o token JWT, então não pode ser um link direto para a API.
export async function apiDownload(path, nomeArquivo) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeader(getStoredToken()) });
  if (!res.ok) {
    await lerResposta(res);
  }

  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export { STORAGE_KEY };
