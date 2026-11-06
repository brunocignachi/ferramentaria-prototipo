import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ProgressRing from '../components/ProgressRing';
import NovaSolicitacaoForm from '../components/NovaSolicitacaoForm';
import {
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  formatarData,
  formatarPrazo,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

export default function DashboardPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');

  // Só solicitante/administrador têm permissão no backend para criar
  // solicitações (ver solicitacaoRoutes.js) — operador só consulta a fila.
  const podeCriar = usuario?.perfil === 'solicitante' || usuario?.perfil === 'administrador';

  const carregarSolicitacoes = useCallback(async () => {
    setCarregando(true);
    try {
      // GET /solicitacoes já vem filtrada por perfil e ordenada por
      // prioridade/prazo (RF06) — ver solicitacaoController.listar.
      const dados = await apiRequest('/solicitacoes');
      setSolicitacoes(dados);
      setErro('');
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarSolicitacoes();
  }, [carregarSolicitacoes]);

  // Canceladas ficam fora dos indicadores — não representam trabalho pendente nem concluído.
  const ativas = useMemo(() => solicitacoes.filter((s) => s.status !== 'cancelada'), [solicitacoes]);

  const pendentes = useMemo(
    () =>
      ativas
        .filter((s) => s.status !== 'concluida')
        .filter((s) => (busca ? s.numero_desenho.toLowerCase().includes(busca.toLowerCase()) : true)),
    [ativas, busca]
  );

  const concluidas = useMemo(() => ativas.filter((s) => s.status === 'concluida').slice(0, 5), [ativas]);

  const totais = useMemo(() => {
    const total = ativas.length || 1;
    const completo = ativas.filter((s) => s.status === 'concluida').length;
    const progresso = ativas.filter((s) => s.status === 'em_andamento').length;
    const aFazer = ativas.filter((s) => s.status === 'aberta').length;
    return {
      completo: Math.round((completo / total) * 100),
      progresso: Math.round((progresso / total) * 100),
      aFazer: Math.round((aFazer / total) * 100),
    };
  }, [ativas]);

  const hoje = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header className="dashboard__topbar">
          <input
            type="search"
            placeholder="Pesquisar por desenho..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <span className="dashboard__date">{hoje}</span>
        </header>

        {erro && <p className="dashboard__error">{erro}</p>}

        <div className="dashboard__grid">
          <section className="card card--tasks">
            <div className="card__header">
              <h2>A ser feito</h2>
              {podeCriar && (
                <button type="button" onClick={() => setMostrarForm((v) => !v)}>
                  {mostrarForm ? 'Cancelar' : '+ adicionar tarefa'}
                </button>
              )}
            </div>

            {mostrarForm && (
              // Depois de criar, segue para o detalhe, onde o roteiro é montado.
              <NovaSolicitacaoForm onCriado={(criada) => navigate(`/solicitacoes/${criada.id_solicitacao}`)} />
            )}

            {carregando ? (
              <p className="card__empty">Carregando...</p>
            ) : pendentes.length === 0 ? (
              <p className="card__empty">Nenhuma solicitação pendente.</p>
            ) : (
              <ul className="task-list">
                {pendentes.map((s) => (
                  <li key={s.id_solicitacao} className="task-list__item">
                    <span className="task-list__dot" style={{ background: PRIORIDADE_COR[s.prioridade] }} />
                    <div className="task-list__body">
                      <strong>
                        <Link className="task-link" to={`/solicitacoes/${s.id_solicitacao}`}>
                          {s.numero_desenho}
                        </Link>
                      </strong>
                      <span>{s.descricao || 'Sem descrição'}</span>
                      <small>
                        Prioridade: {PRIORIDADE_LABEL[s.prioridade]} · Status: {STATUS_SOLICITACAO_LABEL[s.status]} ·
                        Prazo: {formatarPrazo(s.data_prazo)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="dashboard__side">
            <section className="card">
              <h2>Situação Atual</h2>
              <div className="rings">
                <ProgressRing value={totais.completo} color="#16a34a" label="Completo" />
                <ProgressRing value={totais.progresso} color="#2563eb" label="Em progresso" />
                <ProgressRing value={totais.aFazer} color="#ef4444" label="A fazer" />
              </div>
            </section>

            <section className="card">
              <h2>Peças completas</h2>
              {concluidas.length === 0 ? (
                <p className="card__empty">Nenhuma peça concluída ainda.</p>
              ) : (
                <ul className="done-list">
                  {concluidas.map((s) => (
                    <li key={s.id_solicitacao}>
                      <strong>
                        <Link className="task-link" to={`/solicitacoes/${s.id_solicitacao}`}>
                          {s.numero_desenho}
                        </Link>
                      </strong>
                      <span>Quantidade: {s.quantidade}</span>
                      <small>Concluída em {formatarData(s.data_conclusao)}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
