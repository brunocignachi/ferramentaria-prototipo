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
  correspondeABusca,
  formatarData,
  formatarPrazo,
  subtituloDaPeca,
  tituloDaPeca,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Filtro do gráfico "Situação Atual", pela data de abertura da solicitação.
const PERIODOS = {
  semana: { rotulo: 'Última semana', dias: 7 },
  mes: { rotulo: 'Último mês', dias: 30 },
  ano: { rotulo: 'Último ano', dias: 365 },
  todos: { rotulo: 'Todo o período', dias: null },
};

export default function DashboardPage() {
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [mostrarForm, setMostrarForm] = useState(false);
  const [busca, setBusca] = useState('');
  // A data de corte é calculada na troca do filtro, não a cada renderização.
  const [periodo, setPeriodo] = useState({ chave: 'todos', inicio: null });

  function escolherPeriodo(chave) {
    const { dias } = PERIODOS[chave];
    setPeriodo({ chave, inicio: dias ? Date.now() - dias * 24 * 60 * 60 * 1000 : null });
  }

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
        .filter((s) => correspondeABusca(s, busca)),
    [ativas, busca]
  );

  const concluidas = useMemo(() => ativas.filter((s) => s.status === 'concluida').slice(0, 5), [ativas]);

  // Situação atual das solicitações abertas dentro do período escolhido.
  const doPeriodo = useMemo(() => {
    if (periodo.inicio === null) return ativas;
    return ativas.filter((s) => new Date(s.data_abertura).getTime() >= periodo.inicio);
  }, [ativas, periodo]);

  const totais = useMemo(() => {
    const total = doPeriodo.length || 1;
    const completo = doPeriodo.filter((s) => s.status === 'concluida').length;
    const progresso = doPeriodo.filter((s) => s.status === 'em_andamento').length;
    const aFazer = doPeriodo.filter((s) => s.status === 'aberta').length;
    return {
      completo: Math.round((completo / total) * 100),
      progresso: Math.round((progresso / total) * 100),
      aFazer: Math.round((aFazer / total) * 100),
    };
  }, [doPeriodo]);

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
            placeholder="Pesquisar por descrição ou desenho..."
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
              <NovaSolicitacaoForm
                onCriado={(criada, aviso) => navigate(`/solicitacoes/${criada.id_solicitacao}`, { state: { aviso } })}
              />
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
                      <div className="task-list__titulo">
                        <strong>
                          <Link className="task-link" to={`/solicitacoes/${s.id_solicitacao}`}>
                            {tituloDaPeca(s)}
                          </Link>
                        </strong>
                        <span className={`badge badge--${s.status}`}>{STATUS_SOLICITACAO_LABEL[s.status]}</span>
                      </div>
                      <span>{subtituloDaPeca(s)}</span>
                      <small>
                        Prioridade: {PRIORIDADE_LABEL[s.prioridade]} · Prazo: {formatarPrazo(s.data_prazo)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="dashboard__side">
            <section className="card">
              <div className="card__header">
                <h2>Situação Atual</h2>
                <select
                  className="periodo-select"
                  aria-label="Período da situação atual"
                  value={periodo.chave}
                  onChange={(e) => escolherPeriodo(e.target.value)}
                >
                  {Object.entries(PERIODOS).map(([valor, { rotulo }]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rings">
                <ProgressRing value={totais.completo} color="#16a34a" label="Completo" />
                <ProgressRing value={totais.progresso} color="#eab308" label="Em progresso" />
                <ProgressRing value={totais.aFazer} color="#ef4444" label="A fazer" />
              </div>
              <p className="card__empty periodo-total">
                {doPeriodo.length === 0
                  ? 'Nenhuma solicitação aberta neste período.'
                  : `${doPeriodo.length} ${doPeriodo.length === 1 ? 'solicitação' : 'solicitações'} no período`}
              </p>
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
                          {tituloDaPeca(s)}
                        </Link>
                      </strong>
                      <span>
                        {s.descricao?.trim() ? `Desenho: ${s.numero_desenho} · ` : ''}Quantidade: {s.quantidade}
                      </span>
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
