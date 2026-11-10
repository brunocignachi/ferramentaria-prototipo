import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import {
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  correspondeABusca,
  diaLocal,
  formatarPrazo,
  prazoDaSolicitacao,
  subtituloDaPeca,
  tituloDaPeca,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const FILTROS_PRAZO = {
  atrasada: 'Só atrasadas',
  semana: 'Vencem em 7 dias',
};

// Filtros guardados no endereço (?status=&prioridade=&operador=&prazo=), para
// os cartões do dashboard poderem abrir a lista já filtrada.
const CHAVES_FILTRO = ['status', 'prioridade', 'operador', 'prazo'];

// Consulta de solicitações (UC02), incluindo as encerradas, de onde se chega
// ao status e ao histórico completo de cada peça (UC11, UC14).
export default function SolicitacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
  const prioridade = searchParams.get('prioridade') ?? '';
  const operador = searchParams.get('operador') ?? '';
  const prazo = searchParams.get('prazo') ?? '';
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [busca, setBusca] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setCarregando(true);
    apiRequest(`/solicitacoes${status ? `?status=${status}` : ''}`)
      .then((dados) => {
        if (!ativo) return;
        setSolicitacoes(dados);
        setErro('');
      })
      .catch((err) => {
        if (ativo) setErro(err.message);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [status]);

  function alterarFiltro(chave, valor) {
    // Parte do endereço atual: se duas trocas vierem seguidas, a segunda não
    // desfaz a primeira enquanto a tela ainda não atualizou.
    const novos = new URLSearchParams(window.location.search);
    if (valor) novos.set(chave, valor);
    else novos.delete(chave);
    setSearchParams(novos, { replace: true });
  }

  function limparFiltros() {
    setBusca('');
    setSearchParams({}, { replace: true });
  }

  // Operadores que aparecem em alguma etapa das solicitações carregadas.
  const operadores = useMemo(() => {
    const porId = new Map();
    for (const s of solicitacoes) {
      for (const op of s.operadores ?? []) porId.set(op.id_usuario, op.nome);
    }
    return [...porId].map(([id, nome]) => ({ id, nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  }, [solicitacoes]);

  // O prazo de cada solicitação é calculado uma vez por carga da lista.
  const comPrazo = useMemo(() => {
    const hoje = diaLocal();
    const daquiUmaSemana = diaLocal(7);
    return solicitacoes.map((s) => ({ ...s, situacaoPrazo: prazoDaSolicitacao(s, hoje, daquiUmaSemana) }));
  }, [solicitacoes]);

  const visiveis = useMemo(
    () =>
      comPrazo.filter(
        (s) =>
          correspondeABusca(s, busca) &&
          (!prioridade || s.prioridade === prioridade) &&
          (!operador || (s.operadores ?? []).some((op) => String(op.id_usuario) === operador)) &&
          (!prazo || s.situacaoPrazo === prazo)
      ),
    [comPrazo, busca, prioridade, operador, prazo]
  );

  const filtrando = !!busca.trim() || CHAVES_FILTRO.some((chave) => searchParams.get(chave));

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header>
          <h1 className="page-title">{status === 'concluida' ? 'Histórico de peças concluídas' : 'Solicitações'}</h1>
          <p className="page-subtitle">Abra uma solicitação para ver o roteiro e o histórico completo.</p>
        </header>

        <div className="page-filters">
          <input
            type="search"
            aria-label="Pesquisar por descrição ou desenho"
            placeholder="Pesquisar por descrição ou desenho..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <select aria-label="Status" value={status} onChange={(e) => alterarFiltro('status', e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(STATUS_SOLICITACAO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <select
            aria-label="Prioridade"
            value={prioridade}
            onChange={(e) => alterarFiltro('prioridade', e.target.value)}
          >
            <option value="">Todas as prioridades</option>
            {Object.entries(PRIORIDADE_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
          <select aria-label="Operador" value={operador} onChange={(e) => alterarFiltro('operador', e.target.value)}>
            <option value="">Todos os operadores</option>
            {operadores.map((op) => (
              <option key={op.id} value={op.id}>
                {op.nome}
              </option>
            ))}
          </select>
          <select aria-label="Prazo" value={prazo} onChange={(e) => alterarFiltro('prazo', e.target.value)}>
            <option value="">Qualquer prazo</option>
            {Object.entries(FILTROS_PRAZO).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

        {filtrando && !carregando && (
          <p className="filtros-resumo">
            {visiveis.length} de {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
            <button type="button" className="btn btn--texto" onClick={limparFiltros}>
              Limpar filtros
            </button>
          </p>
        )}

        {erro && <p className="dashboard__error">{erro}</p>}

        <section className="card">
          {carregando ? (
            <p className="card__empty">Carregando...</p>
          ) : visiveis.length === 0 ? (
            <p className="card__empty">Nenhuma solicitação encontrada.</p>
          ) : (
            <ul className="task-list">
              {visiveis.map((s) => (
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
                      {s.situacaoPrazo === 'atrasada' && <span className="badge badge--atraso">Em atraso</span>}
                    </div>
                    <span>{subtituloDaPeca(s)}</span>
                    <small>
                      Prioridade: {PRIORIDADE_LABEL[s.prioridade]} · Prazo: {formatarPrazo(s.data_prazo)} · Solicitante:{' '}
                      {s.nome_solicitante}
                    </small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
