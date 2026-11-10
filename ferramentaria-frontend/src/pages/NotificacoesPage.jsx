import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useNotificacoes } from '../context/NotificacoesContext';
import Sidebar from '../components/Sidebar';
import { formatarDataHora } from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const TIPO_LABEL = {
  nova_solicitacao: 'Nova solicitação',
  etapa_atribuida: 'Etapa atribuída',
  cancelada: 'Cancelada',
  concluida: 'Concluída',
};

// Avisos do usuário: etapas atribuídas, solicitações canceladas (E03) e concluídas.
export default function NotificacoesPage() {
  const navigate = useNavigate();
  const { atualizar: atualizarContagem } = useNotificacoes();
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      const dados = await apiRequest('/notificacoes');
      setNotificacoes(dados.notificacoes);
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function abrir(notificacao) {
    try {
      if (!notificacao.lida) {
        await apiRequest(`/notificacoes/${notificacao.id_notificacao}/lida`, { method: 'PATCH' });
        atualizarContagem();
      }
      if (notificacao.id_solicitacao) navigate(`/solicitacoes/${notificacao.id_solicitacao}`);
      else carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function marcarTodas() {
    try {
      await apiRequest('/notificacoes/lidas', { method: 'PATCH' });
      await Promise.all([carregar(), atualizarContagem()]);
    } catch (err) {
      setErro(err.message);
    }
  }

  const temNaoLidas = notificacoes.some((n) => !n.lida);

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header className="detalhe__cabecalho">
          <div>
            <h1 className="page-title">Notificações</h1>
            <p className="page-subtitle">Avisos sobre as solicitações em que você está envolvido.</p>
          </div>
          {temNaoLidas && (
            <div className="detalhe__acoes">
              <button type="button" className="btn" onClick={marcarTodas}>
                Marcar todas como lidas
              </button>
            </div>
          )}
        </header>

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          {carregando ? (
            <p className="card__empty">Carregando...</p>
          ) : notificacoes.length === 0 ? (
            <p className="card__empty">Nenhuma notificação por enquanto.</p>
          ) : (
            <ul className="notificacoes">
              {notificacoes.map((n) => (
                <li key={n.id_notificacao}>
                  <button
                    type="button"
                    className={`notificacao ${n.lida ? '' : 'notificacao--nova'}`}
                    onClick={() => abrir(n)}
                  >
                    <span className={`notificacao__marca notificacao__marca--${n.tipo}`} aria-hidden="true" />
                    <span className="notificacao__corpo">
                      <span className="notificacao__tipo">
                        {TIPO_LABEL[n.tipo] ?? 'Aviso'}
                        {!n.lida && <span className="notificacao__nova">nova</span>}
                      </span>
                      <span className="notificacao__mensagem">{n.mensagem}</span>
                      <small>{formatarDataHora(n.criada_em)}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
