import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import {
  PRIORIDADE_COR,
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  correspondeABusca,
  formatarPrazo,
  subtituloDaPeca,
  tituloDaPeca,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

// Consulta de solicitações (UC02), incluindo as encerradas, de onde se chega
// ao status e ao histórico completo de cada peça (UC11, UC14).
export default function SolicitacoesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? '';
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

  const visiveis = useMemo(
    () => solicitacoes.filter((s) => correspondeABusca(s, busca)),
    [solicitacoes, busca]
  );

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
          <select
            aria-label="Status"
            value={status}
            onChange={(e) => setSearchParams(e.target.value ? { status: e.target.value } : {})}
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_SOLICITACAO_LABEL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </div>

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
