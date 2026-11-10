import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, EVENTO_SESSAO_ENCERRADA, STORAGE_KEY } from '../api/client';

const AuthContext = createContext(null);

function lerAuthSalva() {
  try {
    const bruto = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    // storage corrompido ou indisponível (ex.: aba anônima) — segue sem sessão.
    return null;
  }
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(lerAuthSalva);

  const login = useCallback(async (email, senha, manterConectado) => {
    const dados = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, senha },
      token: null,
    });

    const sessao = { token: dados.token, usuario: dados.usuario };
    const armazenamento = manterConectado ? localStorage : sessionStorage;
    armazenamento.setItem(STORAGE_KEY, JSON.stringify(sessao));
    setAuth(sessao);
    return sessao;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    setAuth(null);
  }, []);

  // A API avisou que a sessão não vale mais (ex.: usuário desativado pelo administrador).
  useEffect(() => {
    const encerrar = () => setAuth(null);
    window.addEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
    return () => window.removeEventListener(EVENTO_SESSAO_ENCERRADA, encerrar);
  }, []);

  const value = {
    usuario: auth?.usuario ?? null,
    token: auth?.token ?? null,
    estaAutenticado: Boolean(auth?.token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider.');
  }
  return ctx;
}
