import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from './AuthContext';
import { lerAvisosNaTela } from '../utils/preferencias';
import Icone from '../components/Icone';

const NotificacoesContext = createContext({ naoLidas: 0, atualizar: async () => {} });

const INTERVALO_CONSULTA_MS = 20000;
const DURACAO_AVISO_MS = 8000;

// Aviso flutuante que aparece quando chega uma notificação com o site aberto.
function AvisoFlutuante({ notificacao, onFechar, onAbrir }) {
  useEffect(() => {
    const temporizador = setTimeout(onFechar, DURACAO_AVISO_MS);
    return () => clearTimeout(temporizador);
  }, [notificacao, onFechar]);

  return (
    <div className="aviso-flutuante" role="status">
      <Icone nome="sino" className="aviso-flutuante__icone" />
      <p>{notificacao.mensagem}</p>
      <div className="aviso-flutuante__acoes">
        {notificacao.id_solicitacao && (
          <Link to={`/solicitacoes/${notificacao.id_solicitacao}`} className="btn btn--primario btn--link" onClick={onAbrir}>
            Ver
          </Link>
        )}
        <button type="button" className="btn" aria-label="Fechar aviso" onClick={onFechar}>
          Fechar
        </button>
      </div>
    </div>
  );
}

/**
 * Consulta periodicamente os avisos do usuário logado: mantém o número de não
 * lidos (sino do menu) e mostra um aviso na tela quando chega um novo.
 */
export function NotificacoesProvider({ children }) {
  const { estaAutenticado, usuario } = useAuth();
  const [naoLidas, setNaoLidas] = useState(0);
  const [avisoNaTela, setAvisoNaTela] = useState(null);
  const ultimoVisto = useRef(null);

  const atualizar = useCallback(async () => {
    try {
      const resumo = await apiRequest('/notificacoes/resumo');
      setNaoLidas(resumo.nao_lidas);
      const maisRecente = resumo.mais_recente;
      // Na primeira consulta só guarda a referência: o aviso na tela é para o que chega depois.
      if (ultimoVisto.current !== null && maisRecente && maisRecente.id_notificacao > ultimoVisto.current) {
        if (lerAvisosNaTela()) setAvisoNaTela(maisRecente);
      }
      if (maisRecente) ultimoVisto.current = Math.max(ultimoVisto.current ?? 0, maisRecente.id_notificacao);
      else if (ultimoVisto.current === null) ultimoVisto.current = 0;
    } catch {
      // Falha momentânea de rede: tenta de novo na próxima consulta.
    }
  }, []);

  useEffect(() => {
    ultimoVisto.current = null;
    setAvisoNaTela(null);
    if (!estaAutenticado) {
      setNaoLidas(0);
      return undefined;
    }
    atualizar();
    const intervalo = setInterval(atualizar, INTERVALO_CONSULTA_MS);
    // Ao voltar para a aba, atualiza na hora.
    const aoVoltar = () => document.visibilityState === 'visible' && atualizar();
    document.addEventListener('visibilitychange', aoVoltar);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener('visibilitychange', aoVoltar);
    };
  }, [estaAutenticado, usuario?.id, atualizar]);

  const fecharAviso = useCallback(() => setAvisoNaTela(null), []);

  async function abrirAviso() {
    const aviso = avisoNaTela;
    setAvisoNaTela(null);
    try {
      await apiRequest(`/notificacoes/${aviso.id_notificacao}/lida`, { method: 'PATCH' });
    } finally {
      atualizar();
    }
  }

  return (
    <NotificacoesContext.Provider value={{ naoLidas, atualizar }}>
      {children}
      {avisoNaTela && <AvisoFlutuante notificacao={avisoNaTela} onFechar={fecharAviso} onAbrir={abrirAviso} />}
    </NotificacoesContext.Provider>
  );
}

export function useNotificacoes() {
  return useContext(NotificacoesContext);
}
