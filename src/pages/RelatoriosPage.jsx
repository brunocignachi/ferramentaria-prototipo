import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest } from '../api/client';
import Sidebar from '../components/Sidebar';
import {
  PRIORIDADE_LABEL,
  STATUS_SOLICITACAO_LABEL,
  formatarData,
  formatarPrazo,
} from '../utils/solicitacao';
import './DashboardPage.css';
import '../styles/Solicitacoes.css';

const FILTROS_INICIAIS = { data_inicio: '', data_fim: '', status: '', id_operador: '' };

function situacaoDoPrazo(s) {
  if (s.status === 'cancelada') return '—';
  if (s.status === 'concluida') return s.concluida_no_prazo ? 'No prazo' : 'Com atraso';
  return s.em_atraso ? 'Em atraso' : 'Dentro do prazo';
}

// Relatório de solicitações por período, status e operador, com o indicador
// On-Time Delivery das peças concluídas (RF09, UC13, E10).
export default function RelatoriosPage() {
  const [filtros, setFiltros] = useState(FILTROS_INICIAIS);
  const [operadores, setOperadores] = useState([]);
  const [relatorio, setRelatorio] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const alterar = (campo, valor) => setFiltros((atuais) => ({ ...atuais, [campo]: valor }));

  async function gerar(criterios) {
    setCarregando(true);
    setErro('');
    try {
      const parametros = new URLSearchParams(Object.entries(criterios).filter(([, valor]) => valor));
      const consulta = parametros.toString();
      setRelatorio(await apiRequest(`/relatorios/solicitacoes${consulta ? `?${consulta}` : ''}`));
    } catch (err) {
      setErro(err.message);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    apiRequest('/usuarios/operadores')
      .then(setOperadores)
      .catch((err) => setErro(err.message));
  }, []);

  const resumo = relatorio?.resumo;

  return (
    <div className="dashboard">
      <Sidebar />

      <main className="dashboard__main">
        <header className="detalhe__cabecalho">
          <div>
            <h1 className="page-title">Relatórios</h1>
            <p className="page-subtitle">Solicitações por data de abertura, status e operador.</p>
          </div>
          {relatorio && (
            <button type="button" className="btn nao-imprimir" onClick={() => window.print()}>
              Imprimir
            </button>
          )}
        </header>

        <form
          className="card nao-imprimir"
          onSubmit={(event) => {
            event.preventDefault();
            gerar(filtros);
          }}
        >
          <div className="form-campos">
            <label>
              Abertura a partir de
              <input
                type="date"
                value={filtros.data_inicio}
                onChange={(e) => alterar('data_inicio', e.target.value)}
              />
            </label>
            <label>
              Abertura até
              <input type="date" value={filtros.data_fim} onChange={(e) => alterar('data_fim', e.target.value)} />
            </label>
            <label>
              Status
              <select value={filtros.status} onChange={(e) => alterar('status', e.target.value)}>
                <option value="">Todos</option>
                {Object.entries(STATUS_SOLICITACAO_LABEL).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Operador
              <select value={filtros.id_operador} onChange={(e) => alterar('id_operador', e.target.value)}>
                <option value="">Todos</option>
                {operadores.map((op) => (
                  <option key={op.id_usuario} value={op.id_usuario}>
                    {op.nome}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-acoes">
            <button type="submit" className="btn btn--primario" disabled={carregando}>
              {carregando ? 'Gerando...' : 'Gerar relatório'}
            </button>
          </div>
        </form>

        {erro && <p className="dashboard__error">{erro}</p>}

        {relatorio && (
          <>
            <dl className="indicadores">
              <div className="indicador">
                <dt>Solicitações</dt>
                <dd>{resumo.total}</dd>
              </div>
              <div className="indicador">
                <dt>Concluídas</dt>
                <dd>{resumo.concluidas}</dd>
                <small>
                  {resumo.concluidas_no_prazo} no prazo · {resumo.concluidas_com_atraso} com atraso
                </small>
              </div>
              <div className="indicador">
                <dt>Abertas em atraso</dt>
                <dd>{resumo.em_atraso}</dd>
              </div>
              <div className="indicador">
                <dt>On-Time Delivery</dt>
                <dd>{resumo.otd_percentual === null ? '—' : `${String(resumo.otd_percentual).replace('.', ',')}%`}</dd>
                <small>Concluídas dentro do prazo</small>
              </div>
            </dl>

            <section className="card">
              {relatorio.solicitacoes.length === 0 ? (
                <p className="card__empty">Nenhuma solicitação encontrada com estes filtros.</p>
              ) : (
                <div className="tabela-rolagem">
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Desenho</th>
                        <th>Status</th>
                        <th>Prioridade</th>
                        <th>Abertura</th>
                        <th>Prazo</th>
                        <th>Conclusão</th>
                        <th>Situação do prazo</th>
                        <th>Solicitante</th>
                        <th>Operadores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.solicitacoes.map((s) => (
                        <tr key={s.id_solicitacao}>
                          <td>
                            <Link className="task-link" to={`/solicitacoes/${s.id_solicitacao}`}>
                              {s.numero_desenho}
                            </Link>
                          </td>
                          <td>{STATUS_SOLICITACAO_LABEL[s.status]}</td>
                          <td>{PRIORIDADE_LABEL[s.prioridade]}</td>
                          <td>{formatarData(s.data_abertura)}</td>
                          <td>{formatarPrazo(s.data_prazo)}</td>
                          <td>{formatarData(s.data_conclusao)}</td>
                          <td>{situacaoDoPrazo(s)}</td>
                          <td>{s.nome_solicitante}</td>
                          <td>{s.operadores ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
