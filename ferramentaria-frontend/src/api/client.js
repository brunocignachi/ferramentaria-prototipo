// Quando o site é aberto por outro aparelho da rede (ex.: celular em
// http://192.168.0.10:5173), "localhost" apontaria para o próprio celular.
// Nesse caso a API é procurada no mesmo computador que serviu o site.
function urlDaApi() {
  const configurada = new URL(import.meta.env.VITE_API_URL || 'http://localhost:3000/api');
  const acessoLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (configurada.hostname === 'localhost' && !acessoLocal) {
    configurada.hostname = window.location.hostname;
  }
  return configurada.toString().replace(/\/$/, '');
}

const API_URL = urlDaApi();
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
    // Sessão que deixou de valer (usuário desativado ou token expirado):
    // encerra a sessão aqui e o AuthContext leva ao login com o motivo.
    if (res.status === 401 && getStoredToken() && !res.url.endsWith('/auth/login')) {
      encerrarSessao(data?.acesso_revogado ? data.erro : 'Sua sessão expirou. Entre novamente.');
    }
    throw new Error(data?.erro || `Erro ${res.status} ao comunicar com a API.`);
  }

  return data;
}

export const EVENTO_SESSAO_ENCERRADA = 'ferramentaria:sessao-encerrada';
const CHAVE_MOTIVO = 'ferramentaria_motivo_saida';

function encerrarSessao(motivo) {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.setItem(CHAVE_MOTIVO, motivo);
  } catch {
    // sem armazenamento: só avisa
  }
  window.dispatchEvent(new CustomEvent(EVENTO_SESSAO_ENCERRADA, { detail: motivo }));
}

// Motivo do último encerramento forçado, lido uma única vez pela tela de login.
export function lerMotivoSaida() {
  try {
    const motivo = sessionStorage.getItem(CHAVE_MOTIVO);
    sessionStorage.removeItem(CHAVE_MOTIVO);
    return motivo;
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

// Os arquivos exigem o token JWT, então não podem ser um link direto para a API.
export async function apiArquivo(path) {
  const res = await fetch(`${API_URL}${path}`, { headers: authHeader(getStoredToken()) });
  if (!res.ok) {
    await lerResposta(res);
  }
  return res.blob();
}

export async function apiDownload(path, nomeArquivo) {
  const url = URL.createObjectURL(await apiArquivo(path));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}

export { STORAGE_KEY };
