import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import EditarSolicitacaoForm from '../components/EditarSolicitacaoForm';
import RoteiroCard from '../components/RoteiroCard';
import HistoricoCard from '../components/HistoricoCard';
import {
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  formatarData,
  formatarPrazo,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Status, dados, roteiro e histórico de uma peça (RF02, RF04, RF05, RF08, UC11, UC14).
export default function SolicitacaoDetalhePage() {
  const { id } = useParams();
  const { usuario } = useAuth();
  const [solicitacao, setSolicitacao] = useState(null);
  const [tipos, setTipos] = useState([]);
  const [operadores, setOperadores] = useState([]);
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    try {
      setSolicitacao(await apiRequest(`/solicitacoes/${id}`));
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    setCarregando(true);
    setSolicitacao(null);
    setEditando(false);
    carregar();
  }, [carregar]);

  const podeGerenciar =
    !!solicitacao && (usuario?.perfil === 'administrador' || solicitacao.id_solicitante === usuario?.id);
  const ativa = solicitacao?.status === 'aberta' || solicitacao?.status === 'em_andamento';
  const precisaDeOpcoes = podeGerenciar && ativa;

  useEffect(() => {
    if (!precisaDeOpcoes) return;
    Promise.all([apiRequest('/tipos-processo'), apiRequest('/usuarios/operadores')])
      .then(([listaTipos, listaOperadores]) => {
        setTipos(listaTipos);
        setOperadores(listaOperadores);
      })
      .catch((err) => setErro(err.message));
  }, [precisaDeOpcoes]);

  async function cancelarSolicitacao() {
    if (!window.confirm('Cancelar esta solicitação e todas as etapas abertas? Essa ação não pode ser desfeita.')) {
      return;
    }
    try {
      await apiRequest(`/solicitacoes/${id}`, { method: 'DELETE' });
      await carregar();
    } catch (err) {
      setErro(err.message);
    }
  }

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <Link to="/solicitacoes" className="page-back">
          ← Voltar às solicitações
        </Link>

        {erro && <p className="dashboard__error">{erro}</p>}
        {carregando && <p className="card__empty">Carregando...</p>}

        {solicitacao && (
          <>
            <header className="detalhe__cabecalho">
              <div className="detalhe__titulo">
                <h1 className="page-title">{solicitacao.numero_desenho}</h1>
                <span className={`badge badge--${solicitacao.status}`}>
                  {STATUS_SOLICITACAO_LABEL[solicitacao.status]}
                </span>
              </div>

              {podeGerenciar && ativa && !editando && (
                <div className="detalhe__acoes">
                  <button type="button" className="btn" onClick={() => setEditando(true)}>
                    Editar
                  </button>
                  <button type="button" className="btn btn--perigo" onClick={cancelarSolicitacao}>
                    Cancelar solicitação
                  </button>
                </div>
              )}
            </header>

            <section className="card">
              <h2>Dados da solicitação</h2>
              {editando ? (
                <EditarSolicitacaoForm
                  solicitacao={solicitacao}
                  onCancelar={() => setEditando(false)}
                  onSalvo={async () => {
                    await carregar();
                    setEditando(false);
                  }}
                />
              ) : (
                <dl className="detalhe__dados">
                  <div>
                    <dt>Prioridade</dt>
                    <dd>{PRIORIDADE_LABEL[solicitacao.prioridade]}</dd>
                  </div>
                  <div>
                    <dt>Prazo</dt>
                    <dd>{formatarPrazo(solicitacao.data_prazo)}</dd>
                  </div>
                  <div>
                    <dt>Quantidade</dt>
                    <dd>{solicitacao.quantidade}</dd>
                  </div>
                  <div>
                    <dt>Solicitante</dt>
                    <dd>{solicitacao.nome_solicitante}</dd>
                  </div>
                  <div>
                    <dt>Abertura</dt>
                    <dd>{formatarData(solicitacao.data_abertura)}</dd>
                  </div>
                  {solicitacao.data_conclusao && (
                    <div>
                      <dt>Conclusão</dt>
                      <dd>{formatarData(solicitacao.data_conclusao)}</dd>
                    </div>
                  )}
                  <div className="detalhe__dado--largo">
                    <dt>Descrição</dt>
                    <dd>{solicitacao.descricao || '—'}</dd>
                  </div>
                  {solicitacao.observacoes && (
                    <div className="detalhe__dado--largo">
                      <dt>Observações</dt>
                      <dd>{solicitacao.observacoes}</dd>
                    </div>
                  )}
                </dl>
              )}
            </section>

            <RoteiroCard
              solicitacao={solicitacao}
              usuario={usuario}
              podeGerenciar={podeGerenciar}
              tipos={tipos}
              operadores={operadores}
              onAlterado={carregar}
            />

            <HistoricoCard historico={solicitacao.historico} />
          </>
        )}
      </main>
    </div>
  );
}
